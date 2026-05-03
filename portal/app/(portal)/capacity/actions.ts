"use server";

import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { sites, cabinets } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { linearRegression, forecastCrossing, formatForecast } from "@/lib/forecast";

export interface SitePower {
  siteId: string;
  siteName: string;
  siteCode: string;
  allocatedKw: number;  // sum of cabinet powerCapKw
  currentKw: number | null;  // latest reading
  pue: number | null;
  trend7d: Array<{ ts: string; avgKw: number }>;
  trend30d: Array<{ ts: string; avgKw: number }>;
  forecastHit80pct: string; // human-readable forecast
}

export interface CapacityData {
  sites: SitePower[];
  lastUpdated: string | null;
}

async function getBmsMetrics(
  orgId: string,
  metric: string,
  days: number,
): Promise<Array<{ source_id: string; bucket: string; avg_value: number }>> {
  try {
    const result = await db.execute(sql.raw(`
      SELECT source_id, time_bucket('1 day', recorded_at)::text AS bucket, avg(value) AS avg_value
      FROM bms_metrics
      WHERE org_id = '${orgId}'
        AND metric = '${metric}'
        AND recorded_at >= now() - interval '${days} days'
      GROUP BY 1, 2
      ORDER BY 2 ASC
    `)) as unknown as Array<{ source_id: string; bucket: string; avg_value: number }>;
    return result;
  } catch {
    // bms_metrics table may not exist if TimescaleDB is not set up
    return [];
  }
}

async function getLatestBms(
  orgId: string,
  metric: string,
): Promise<Array<{ source_id: string; value: number; rack_ext_id: string | null }>> {
  try {
    const result = await db.execute(sql.raw(`
      SELECT DISTINCT ON (source_id)
        source_id, value, rack_ext_id
      FROM bms_metrics
      WHERE org_id = '${orgId}' AND metric = '${metric}'
      ORDER BY source_id, recorded_at DESC
    `)) as unknown as Array<{ source_id: string; value: number; rack_ext_id: string | null }>;
    return result;
  } catch {
    return [];
  }
}

export async function getCapacityData(): Promise<CapacityData> {
  const { orgId } = await requireSession();

  const [siteRows, trend7d, trend30d, latestPower, latestPue] = await Promise.all([
    db
      .select({
        id: sites.id,
        name: sites.name,
        code: sites.code,
        externalId: sites.externalId,
      })
      .from(sites)
      .where(eq(sites.orgId, orgId))
      .orderBy(sites.name),

    getBmsMetrics(orgId, "power_kw", 7),
    getBmsMetrics(orgId, "power_kw", 30),
    getLatestBms(orgId, "power_kw"),
    getLatestBms(orgId, "pue"),
  ]);

  // Per-site cabinet power cap
  const cabinetRows = await db
    .select({
      siteId: cabinets.siteId,
      powerCapKw: cabinets.powerCapKw,
    })
    .from(cabinets)
    .where(and(eq(cabinets.orgId, orgId)))
    .orderBy(cabinets.siteId);

  const allocMap = new Map<string, number>();
  for (const c of cabinetRows) {
    allocMap.set(c.siteId, (allocMap.get(c.siteId) ?? 0) + (c.powerCapKw ?? 0));
  }

  const result: SitePower[] = siteRows.map((site) => {
    const allocatedKw = allocMap.get(site.id) ?? 0;
    const allocated80 = allocatedKw * 0.8;

    // Aggregate power readings by day
    const siteTrend7 = trend7d
      .filter(() => true) // all sources contribute to site total
      .reduce((acc: Record<string, number>, r) => {
        acc[r.bucket] = (acc[r.bucket] ?? 0) + r.avg_value;
        return acc;
      }, {});
    const siteTrend30 = trend30d.reduce((acc: Record<string, number>, r) => {
      acc[r.bucket] = (acc[r.bucket] ?? 0) + r.avg_value;
      return acc;
    }, {});

    const trend7dArr = Object.entries(siteTrend7)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ts, avgKw]) => ({ ts, avgKw: Math.round(avgKw * 100) / 100 }));

    const trend30dArr = Object.entries(siteTrend30)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ts, avgKw]) => ({ ts, avgKw: Math.round(avgKw * 100) / 100 }));

    const currentKwRaw = latestPower.reduce((sum, r) => sum + r.value, 0);
    const currentKw = latestPower.length > 0 ? Math.round(currentKwRaw * 100) / 100 : null;
    const pueRaw = latestPue.length > 0
      ? latestPue.reduce((s, r) => s + r.value, 0) / latestPue.length
      : null;
    const pue = pueRaw ? Math.round(pueRaw * 1000) / 1000 : null;

    // Forecast: when does power hit 80% of cap?
    const forecastPoints = trend30dArr.map((p) => ({ x: new Date(p.ts).getTime(), y: p.avgKw }));
    const crossDate = forecastCrossing(forecastPoints, allocated80);
    const forecastHit80pct = allocatedKw === 0
      ? "No cap set"
      : crossDate
        ? `In ${formatForecast(crossDate)}`
        : currentKw !== null && currentKw >= allocated80
          ? "Already at 80%"
          : "Not trending";

    return {
      siteId: site.id,
      siteName: site.name,
      siteCode: site.code,
      allocatedKw,
      currentKw,
      pue,
      trend7d: trend7dArr,
      trend30d: trend30dArr,
      forecastHit80pct,
    };
  });

  const lastUpdated = latestPower.length > 0 ? new Date().toISOString() : null;

  return { sites: result, lastUpdated };
}

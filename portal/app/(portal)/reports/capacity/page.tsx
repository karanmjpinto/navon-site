import Link from "next/link";
import { eq, and, gte, asc, sum, sql } from "drizzle-orm";
import { db } from "@/db";
import { metricsSeed, cabinets } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { MetricArea } from "@/components/charts";
import { Eyebrow, Empty } from "@/components/forms";

// Linear regression — y = a + b·x — over the last 30 days of points.
// Used to project the date when power draw crosses the cabinet cap.
function linregress(xs: number[], ys: number[]): { a: number; b: number } {
  const n = xs.length;
  if (n < 2) return { a: ys[0] ?? 0, b: 0 };
  const sx = xs.reduce((s, v) => s + v, 0);
  const sy = ys.reduce((s, v) => s + v, 0);
  const sxx = xs.reduce((s, v) => s + v * v, 0);
  const sxy = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  return { a, b };
}

export default async function CapacityReport() {
  const { orgId } = await requireSession();

  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const points = await db
    .select()
    .from(metricsSeed)
    .where(and(eq(metricsSeed.orgId, orgId), gte(metricsSeed.ts, since)))
    .orderBy(asc(metricsSeed.ts));

  // Daily averages over the window for the chart and the regression.
  const byDay = new Map<string, { sum: number; count: number }>();
  for (const p of points) {
    const day = p.ts.toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { sum: 0, count: 0 };
    cur.sum += p.powerKw;
    cur.count += 1;
    byDay.set(day, cur);
  }
  const daily = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({
      ts: new Date(d).getTime(),
      value: +(v.sum / v.count).toFixed(2),
    }));

  // Cabinet cap aggregation
  const [capRow] = await db
    .select({ totalCap: sum(cabinets.powerCapKw).mapWith(Number) })
    .from(cabinets)
    .where(eq(cabinets.orgId, orgId));
  const totalCap = capRow?.totalCap ?? 0;

  const xs = daily.map((d) => d.ts / (24 * 3600_000));
  const ys = daily.map((d) => d.value);
  const { a, b } = linregress(xs, ys);
  const lastValue = ys.at(-1) ?? 0;
  const slopePerDay = b;
  const slopePerWeek = slopePerDay * 7;

  // Days until projected line crosses cap (only if growing toward cap)
  let daysToCap: number | null = null;
  if (totalCap > 0 && slopePerDay > 0.0001 && lastValue < totalCap) {
    const today = (Date.now() / (24 * 3600_000));
    const tCross = (totalCap - a) / b;
    if (Number.isFinite(tCross) && tCross > today) {
      daysToCap = Math.round(tCross - today);
    }
  }

  return (
    <div className="max-w-4xl space-y-10">
      <Link
        href="/reports"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All reports
      </Link>

      <div>
        <Eyebrow>Reporting</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">
          Capacity forecast
        </h1>
        <p className="text-mid text-sm mt-2 max-w-xl">
          30-day daily-mean power draw with a linear projection against your
          committed cabinet caps. Use this to plan upgrades before you hit a
          headroom crunch.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-charcoal border border-charcoal">
        <Stat
          label="Latest daily mean"
          value={`${lastValue.toFixed(2)} kW`}
          sub="last day in window"
        />
        <Stat
          label="Cabinet cap (total)"
          value={`${totalCap.toFixed(1)} kW`}
          sub="sum across cabinets"
        />
        <Stat
          label="7-day trend"
          value={`${slopePerWeek >= 0 ? "+" : ""}${slopePerWeek.toFixed(2)} kW/wk`}
          sub={
            daysToCap != null
              ? `≈ ${daysToCap} days to cap`
              : "headroom stable"
          }
        />
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-3">
          Daily mean power (kW) — last 30 days
        </p>
        {daily.length === 0 ? (
          <Empty>Not enough data yet.</Empty>
        ) : (
          <div className="border border-charcoal p-3 bg-ink-2">
            <MetricArea data={daily} unit="kW" />
          </div>
        )}
      </section>

      <p className="text-xs text-mid">
        Forecasting model is intentionally simple (least-squares fit on daily
        means). When seasonality matters or a customer asks for a more
        sophisticated model, swap this with Holt-Winters or a small Prophet
        run as a Phase 2 enhancement.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-ink p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate mb-3">
        {label}
      </p>
      <p className="text-3xl font-medium tracking-tight mb-1">{value}</p>
      <p className="text-xs text-mid">{sub}</p>
    </div>
  );
}

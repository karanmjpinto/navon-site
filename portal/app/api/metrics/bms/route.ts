/**
 * POST /api/metrics/bms
 *
 * BMS telemetry ingestion endpoint. Accepts vendor-agnostic BmsReading
 * batches authenticated by a metrics API token (same tokens as /api/metrics).
 *
 * Writes into the bms_metrics TimescaleDB hypertable. Each reading is one row.
 *
 * curl example:
 *   curl -X POST https://portal.navonworld.com/api/metrics/bms \
 *     -H "Authorization: Bearer navon_mt_..." \
 *     -H "Content-Type: application/json" \
 *     -d '{"readings":[{"sourceId":"pdu-hg-a01","metric":"power_kw","value":14.6,"recordedAt":"2026-05-03T01:00:00Z","rackExternalId":"netbox:10"}]}'
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { metricsTokens } from "@/db/schema";
import { hashToken } from "@/lib/metrics-tokens";

const readingSchema = z.object({
  sourceId: z.string().min(1).max(200),
  metric: z.enum(["power_kw", "temp_c", "humidity_pct", "pue"]),
  value: z.number().finite(),
  recordedAt: z.coerce.date(),
  deviceExternalId: z.string().optional(),
  rackExternalId: z.string().optional(),
  siteExternalId: z.string().optional(),
});

const bodySchema = z.object({
  readings: z.array(readingSchema).min(1).max(5000),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "missing bearer" }, { status: 401 });
  }
  const token = auth.slice(7).trim();
  const tokenHash = hashToken(token);

  const [tok] = await db
    .select()
    .from(metricsTokens)
    .where(and(eq(metricsTokens.tokenHash, tokenHash), isNull(metricsTokens.revokedAt)))
    .limit(1);
  if (!tok) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const rows = parsed.data.readings.map((r) => ({
    orgId: tok.orgId,
    sourceId: r.sourceId,
    metric: r.metric,
    value: r.value,
    recordedAt: r.recordedAt,
    siteExtId: r.siteExternalId ?? null,
    rackExtId: r.rackExternalId ?? null,
    deviceExtId: r.deviceExternalId ?? null,
  }));

  // Batch insert via raw SQL to avoid Drizzle not knowing the hypertable schema.
  // TimescaleDB hypertables don't have a Drizzle schema definition because they
  // are managed outside drizzle-kit migrations.
  if (rows.length > 0) {
    const values = rows
      .map(
        (r) =>
          `(${[
            `'${r.orgId}'`,
            `'${r.sourceId.replace(/'/g, "''")}'`,
            `'${r.metric}'`,
            r.value,
            `'${r.recordedAt.toISOString()}'`,
            r.siteExtId ? `'${r.siteExtId.replace(/'/g, "''")}'` : "NULL",
            r.rackExtId ? `'${r.rackExtId.replace(/'/g, "''")}'` : "NULL",
            r.deviceExtId ? `'${r.deviceExtId.replace(/'/g, "''")}'` : "NULL",
          ].join(", ")})`,
      )
      .join(", ");

    await db.execute(
      sql.raw(
        `INSERT INTO bms_metrics (org_id, source_id, metric, value, recorded_at, site_ext_id, rack_ext_id, device_ext_id)
         VALUES ${values}`,
      ),
    );
  }

  await db
    .update(metricsTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(metricsTokens.id, tok.id));

  return NextResponse.json({ accepted: rows.length }, { status: 202 });
}

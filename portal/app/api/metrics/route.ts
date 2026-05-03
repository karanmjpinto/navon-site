import { eq, and, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { metricsTokens, metrics } from "@/db/schema";
import { hashToken } from "@/lib/metrics-tokens";
import { evaluateAlertsForOrg } from "@/lib/alerts";

// Metrics ingestion endpoint. DCIM/BMS systems POST batches of metric
// points authenticated by a bearer token. Writes to the `metrics`
// TimescaleDB hypertable (see migration 0002); all queries are backward-
// compatible with the Phase 1 regular-table contract.
//
// curl -X POST https://portal.navonworld.com/api/metrics \
//   -H "Authorization: Bearer navon_mt_..." \
//   -H "Content-Type: application/json" \
//   -d '{"points":[{"ts":"2026-05-02T14:30:00Z","powerKw":14.6,"powerKwh":1234.5,"tempC":22.4,"bandwidthGbps":0.81}]}'

const pointSchema = z.object({
  ts: z.coerce.date(),
  powerKw: z.number(),
  powerKwh: z.number(),
  tempC: z.number(),
  bandwidthGbps: z.number(),
});

const bodySchema = z.object({
  points: z.array(pointSchema).min(1).max(2000),
});

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return new Response("missing bearer", { status: 401 });
  }
  const token = auth.slice(7).trim();
  const tokenHash = hashToken(token);

  const [tok] = await db
    .select()
    .from(metricsTokens)
    .where(
      and(
        eq(metricsTokens.tokenHash, tokenHash),
        isNull(metricsTokens.revokedAt),
      ),
    )
    .limit(1);
  if (!tok) return new Response("invalid token", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation", issues: parsed.error.issues }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const rows = parsed.data.points.map((p) => ({
    orgId: tok.orgId,
    ts: p.ts,
    powerKw: p.powerKw,
    powerKwh: p.powerKwh,
    tempC: p.tempC,
    bandwidthGbps: p.bandwidthGbps,
  }));

  // Upsert by (org_id, ts) so retries are idempotent.
  await db
    .insert(metrics)
    .values(rows)
    .onConflictDoUpdate({
      target: [metrics.orgId, metrics.ts],
      set: {
        powerKw: sql`excluded.power_kw`,
        powerKwh: sql`excluded.power_kwh`,
        tempC: sql`excluded.temp_c`,
        bandwidthGbps: sql`excluded.bandwidth_gbps`,
      },
    });

  await db
    .update(metricsTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(metricsTokens.id, tok.id));

  // Best-effort threshold-alert evaluation. Don't block the ingest
  // response if it errors.
  let alertsFired = 0;
  try {
    alertsFired = await evaluateAlertsForOrg(tok.orgId);
  } catch (err) {
    console.error("[alerts] eval failed", err);
  }

  return new Response(
    JSON.stringify({ accepted: rows.length, alertsFired }),
    { status: 202, headers: { "content-type": "application/json" } },
  );
}

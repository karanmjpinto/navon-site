#!/usr/bin/env tsx
/**
 * Mock BMS data generator.
 *
 * Emits realistic-looking sensor readings every 30s for the seeded NetBox
 * devices. Runs until Ctrl-C. Useful for local dev and demo.
 *
 * Usage:
 *   pnpm mock:bms
 *   # or:
 *   PORTAL_URL=http://localhost:3002 BMS_TOKEN=navon_mt_... pnpm tsx scripts/mock-bms.ts
 *
 * The BMS_TOKEN must be a metrics_tokens bearer token for the target org.
 * Create one via Settings → API Tokens in the portal, then copy the raw token.
 */

const PORTAL_URL = process.env.PORTAL_URL ?? "http://localhost:3002";
const BMS_TOKEN = process.env.BMS_TOKEN;
const INTERVAL_MS = 30_000;

if (!BMS_TOKEN) {
  console.error("BMS_TOKEN env var is required — create a token via Settings → API Tokens");
  process.exit(1);
}

// Simulated rack sources matching the seed fixture
const SOURCES = [
  { sourceId: "pdu-hg-a01", rackExternalId: "netbox:10", siteExternalId: "netbox:1", baseKw: 8.4, baseTempC: 21.5 },
  { sourceId: "pdu-hg-a02", rackExternalId: "netbox:11", siteExternalId: "netbox:1", baseKw: 6.2, baseTempC: 22.1 },
];

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function buildReadings(nowIso: string) {
  const readings = [];
  for (const src of SOURCES) {
    const powerKw = jitter(src.baseKw, 0.08);
    const tempC = jitter(src.baseTempC, 0.03);
    const humidity = jitter(55, 0.05);
    // PUE varies slightly around 1.4
    const pue = jitter(1.4, 0.02);

    readings.push(
      { sourceId: src.sourceId, metric: "power_kw", value: Math.round(powerKw * 100) / 100, recordedAt: nowIso, rackExternalId: src.rackExternalId, siteExternalId: src.siteExternalId },
      { sourceId: src.sourceId, metric: "temp_c", value: Math.round(tempC * 10) / 10, recordedAt: nowIso, rackExternalId: src.rackExternalId, siteExternalId: src.siteExternalId },
      { sourceId: src.sourceId, metric: "humidity_pct", value: Math.round(humidity * 10) / 10, recordedAt: nowIso, rackExternalId: src.rackExternalId, siteExternalId: src.siteExternalId },
      { sourceId: src.sourceId, metric: "pue", value: Math.round(pue * 1000) / 1000, recordedAt: nowIso, siteExternalId: src.siteExternalId },
    );
  }
  return readings;
}

async function emit() {
  const nowIso = new Date().toISOString();
  const readings = buildReadings(nowIso);
  try {
    const res = await fetch(`${PORTAL_URL}/api/metrics/bms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BMS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ readings }),
    });
    if (res.ok) {
      const body = await res.json() as { accepted: number };
      console.log(`[mock-bms] ${nowIso} — sent ${body.accepted} readings ✓`);
    } else {
      const text = await res.text();
      console.error(`[mock-bms] ${nowIso} — HTTP ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error(`[mock-bms] ${nowIso} — network error:`, err);
  }
}

console.log(`[mock-bms] Starting — sending to ${PORTAL_URL}/api/metrics/bms every ${INTERVAL_MS / 1000}s`);
console.log(`[mock-bms] Sources: ${SOURCES.map((s) => s.sourceId).join(", ")}`);
console.log("[mock-bms] Press Ctrl-C to stop.");

await emit(); // immediate first emit
setInterval(emit, INTERVAL_MS);

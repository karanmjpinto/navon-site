#!/usr/bin/env tsx
// DCIM / BMS reference connector for the Navon portal metrics API.
//
// Run on the host with access to your BMS/DCIM system:
//   tsx scripts/dcim-agent.ts
//
// Required env vars:
//   METRICS_API_URL   — e.g. https://portal.navonworld.com/api/metrics
//   METRICS_API_TOKEN — bearer token from Settings → API Tokens in the portal
//
// Adapter selection (set one):
//   DCIM_ADAPTER=snmp   (default)  polls SNMP OIDs from a power/env device
//   DCIM_ADAPTER=rest              polls a JSON REST endpoint
//
// SNMP adapter env vars:
//   SNMP_HOST          — device IP or hostname
//   SNMP_COMMUNITY     — community string (default: public)
//   SNMP_VERSION       — "1" | "2c" (default: "2c")
//   OID_POWER_KW       — OID returning power draw in watts (will be ÷ 1000)
//   OID_POWER_KWH      — OID returning cumulative kWh counter
//   OID_TEMP_C         — OID returning temperature in 0.1°C units (will be ÷ 10)
//   OID_BANDWIDTH_GBPS — OID returning bandwidth in Mbps (will be ÷ 1000)
//
// REST adapter env vars:
//   REST_ENDPOINT   — URL that returns JSON
//   REST_AUTH       — optional "Bearer <token>" or "Basic <b64>" header value
//   REST_MAP_POWER_KW       — JSONPath-like dotted key for power_kw value
//   REST_MAP_POWER_KWH      — dotted key for power_kwh
//   REST_MAP_TEMP_C         — dotted key for temp_c
//   REST_MAP_BANDWIDTH_GBPS — dotted key for bandwidth_gbps
//
// Optional:
//   POLL_INTERVAL_MS  — poll frequency in ms (default: 60000)
//   BATCH_SIZE        — flush to API after this many points (default: 10)
//   DRY_RUN=1         — print what would be sent without POSTing

import * as snmp from "net-snmp";

// ── Config ────────────────────────────────────────────────────────────────────

const API_URL   = required("METRICS_API_URL");
const API_TOKEN = required("METRICS_API_TOKEN");
const ADAPTER   = (process.env.DCIM_ADAPTER ?? "snmp") as "snmp" | "rest";
const INTERVAL  = Number(process.env.POLL_INTERVAL_MS ?? 60_000);
const BATCH_SZ  = Number(process.env.BATCH_SIZE ?? 10);
const DRY_RUN   = process.env.DRY_RUN === "1";

function required(name: string): string {
  const v = process.env[name];
  if (!v) { console.error(`[dcim-agent] missing required env var: ${name}`); process.exit(1); }
  return v;
}

// ── Metric point ──────────────────────────────────────────────────────────────

interface MetricPoint {
  ts:             string;  // ISO 8601
  powerKw:        number;
  powerKwh:       number;
  tempC:          number;
  bandwidthGbps:  number;
}

// ── SNMP adapter ──────────────────────────────────────────────────────────────

async function pollSnmp(): Promise<MetricPoint> {
  const host      = required("SNMP_HOST");
  const community = process.env.SNMP_COMMUNITY ?? "public";
  const version   = process.env.SNMP_VERSION === "1" ? snmp.Version1 : snmp.Version2c;

  const oids = [
    process.env.OID_POWER_KW       ?? "1.3.6.1.4.1.13742.6.5.2.3.1.4.1.1",  // Raritan PX2 inlet power (W)
    process.env.OID_POWER_KWH      ?? "1.3.6.1.4.1.13742.6.5.2.3.1.7.1.1",  // Raritan PX2 inlet energy
    process.env.OID_TEMP_C         ?? "1.3.6.1.4.1.13742.6.5.7.3.1.4.1.1",  // Raritan PX2 sensor temp (0.1°C)
    process.env.OID_BANDWIDTH_GBPS ?? "",                                      // optional — 0 if not configured
  ];

  const session = snmp.createSession(host, community, { version });

  return new Promise((resolve, reject) => {
    const activeOids = oids.filter(Boolean);
    session.get(activeOids, (err: Error | null, varbinds: snmp.VarBind[]) => {
      session.close();
      if (err) return reject(err);
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) return reject(new Error(snmp.varbindError(vb)));
      }

      const raw = (i: number) => (varbinds[i]?.value as number) ?? 0;

      resolve({
        ts:            new Date().toISOString(),
        powerKw:       raw(0) / 1000,
        powerKwh:      raw(1),
        tempC:         raw(2) / 10,
        bandwidthGbps: oids[3] ? raw(3) / 1000 : 0,
      });
    });
  });
}

// ── REST adapter ──────────────────────────────────────────────────────────────

function dig(obj: unknown, path: string): number {
  if (!path) return 0;
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return 0;
    cur = (cur as Record<string, unknown>)[k];
  }
  return Number(cur) || 0;
}

async function pollRest(): Promise<MetricPoint> {
  const endpoint = required("REST_ENDPOINT");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.REST_AUTH) headers["Authorization"] = process.env.REST_AUTH;

  const res = await fetch(endpoint, { headers });
  if (!res.ok) throw new Error(`REST poll failed: ${res.status} ${res.statusText}`);
  const data = await res.json();

  return {
    ts:            new Date().toISOString(),
    powerKw:       dig(data, process.env.REST_MAP_POWER_KW       ?? "power_kw"),
    powerKwh:      dig(data, process.env.REST_MAP_POWER_KWH      ?? "power_kwh"),
    tempC:         dig(data, process.env.REST_MAP_TEMP_C         ?? "temp_c"),
    bandwidthGbps: dig(data, process.env.REST_MAP_BANDWIDTH_GBPS ?? "bandwidth_gbps"),
  };
}

// ── Flush to API ──────────────────────────────────────────────────────────────

async function flush(batch: MetricPoint[]): Promise<void> {
  if (DRY_RUN) {
    console.log("[dcim-agent] DRY RUN — would send:", JSON.stringify({ points: batch }, null, 2));
    return;
  }

  const res = await fetch(API_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ points: batch }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API rejected batch: ${res.status} — ${text}`);
  }

  const { accepted, alertsFired } = await res.json();
  console.log(`[dcim-agent] flushed ${accepted} point(s)${alertsFired ? `, ${alertsFired} alert(s) fired` : ""}`);
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function poll(): Promise<MetricPoint> {
  return ADAPTER === "rest" ? pollRest() : pollSnmp();
}

async function main() {
  console.log(`[dcim-agent] starting — adapter=${ADAPTER}, interval=${INTERVAL}ms, dry=${DRY_RUN}`);

  const batch: MetricPoint[] = [];
  let consecutive = 0;

  while (true) {
    try {
      const point = await poll();
      batch.push(point);
      consecutive = 0;
      console.log(`[dcim-agent] polled — power=${point.powerKw.toFixed(2)}kW temp=${point.tempC.toFixed(1)}°C bw=${point.bandwidthGbps.toFixed(3)}Gbps`);

      if (batch.length >= BATCH_SZ) {
        await flush(batch.splice(0));
      }
    } catch (err) {
      consecutive++;
      const backoff = Math.min(consecutive * INTERVAL, 10 * 60_000);
      console.error(`[dcim-agent] poll error (${consecutive} consecutive), backing off ${backoff}ms:`, err);
      await sleep(backoff);
      continue;
    }

    await sleep(INTERVAL);
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("[dcim-agent] fatal:", err);
  process.exit(1);
});

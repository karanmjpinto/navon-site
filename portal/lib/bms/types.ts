/**
 * BMS ingestion contract.
 *
 * Vendor-agnostic shape for a single telemetry reading. Adapters for
 * APC SNMP, Raritan, and custom REST vendors each map their native payload
 * to this shape, then POST it to /api/metrics.
 *
 * All numeric values use SI base units (kW, °C, %).
 */

export type BmsMetric =
  | "power_kw"        // Active power draw in kilowatts
  | "temp_c"          // Temperature in Celsius
  | "humidity_pct"    // Relative humidity 0–100
  | "pue";            // Power Usage Effectiveness (ratio, typically 1.0–2.5)

export interface BmsReading {
  /** Vendor/source identifier (e.g., "apc-snmp-rack-01", "raritan-pdu-hg-a01") */
  sourceId: string;

  metric: BmsMetric;
  value: number;

  /** ISO 8601 timestamp — when the reading was taken at source */
  recordedAt: string;

  /** Link to NetBox object if known (optional) */
  deviceExternalId?: string;   // "netbox:42"
  rackExternalId?: string;     // "netbox:10"
  siteExternalId?: string;     // "netbox:1"
}

export interface BmsReadingBatch {
  readings: BmsReading[];
}

/** Validated reading with org context — internal type after auth middleware */
export interface BmsReadingWithOrg extends BmsReading {
  orgId: string;
}

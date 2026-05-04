-- Migration 0006: metrics TimescaleDB hypertable
-- Stores per-org power / temperature / bandwidth readings.
-- Referenced by the dashboard and capacity pages.

CREATE TABLE IF NOT EXISTS "metrics" (
  "org_id"           uuid          NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "ts"               timestamptz   NOT NULL,
  "power_kw"         double precision NOT NULL,
  "power_kwh"        double precision NOT NULL,
  "temp_c"           double precision NOT NULL,
  "bandwidth_gbps"   double precision NOT NULL,
  CONSTRAINT "metrics_pkey" PRIMARY KEY ("org_id", "ts")
);

SELECT create_hypertable('metrics', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS metrics_org_ts_idx ON metrics (org_id, ts DESC);

ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY metrics_isolate ON metrics
  USING (org_id = app_current_org());

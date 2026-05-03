-- Migration 0005: BMS metrics hypertable (TimescaleDB)
--
-- bms_metrics stores one row per reading. TimescaleDB chunks by 1 day.
-- Continuous aggregates give us hourly + daily rollups without full-table scans.
-- Raw data retained 90 days; rollups retained 2 years.
--
-- TimescaleDB must be installed and the extension enabled before this migration.
-- The Navon docker-compose uses timescaledb/timescaledb:latest-pg17 for dev.

-- ── Raw readings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bms_metrics (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_id     text        NOT NULL,
  metric        text        NOT NULL,   -- power_kw | temp_c | humidity_pct | pue
  value         double precision NOT NULL,
  recorded_at   timestamptz NOT NULL,
  site_ext_id   text,
  rack_ext_id   text,
  device_ext_id text
);

-- Convert to hypertable partitioned by recorded_at (1-day chunks)
SELECT create_hypertable(
  'bms_metrics',
  'recorded_at',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS bms_metrics_org_idx    ON bms_metrics (org_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS bms_metrics_source_idx ON bms_metrics (source_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS bms_metrics_metric_idx ON bms_metrics (org_id, metric, recorded_at DESC);

-- ── Hourly rollup (continuous aggregate) ─────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS bms_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', recorded_at) AS bucket,
  org_id,
  source_id,
  metric,
  avg(value)  AS avg_value,
  min(value)  AS min_value,
  max(value)  AS max_value,
  count(*)    AS sample_count
FROM bms_metrics
GROUP BY 1, 2, 3, 4
WITH NO DATA;

-- ── Daily rollup ──────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS bms_metrics_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', recorded_at) AS bucket,
  org_id,
  source_id,
  metric,
  avg(value)  AS avg_value,
  min(value)  AS min_value,
  max(value)  AS max_value,
  count(*)    AS sample_count
FROM bms_metrics
GROUP BY 1, 2, 3, 4
WITH NO DATA;

-- ── Retention policies ────────────────────────────────────────────
-- Raw: 90 days
SELECT add_retention_policy('bms_metrics', INTERVAL '90 days', if_not_exists => TRUE);

-- Rollups: 2 years
SELECT add_retention_policy('bms_metrics_hourly', INTERVAL '730 days', if_not_exists => TRUE);
SELECT add_retention_policy('bms_metrics_daily',  INTERVAL '730 days', if_not_exists => TRUE);

-- ── Continuous aggregate refresh policies ─────────────────────────
SELECT add_continuous_aggregate_policy('bms_metrics_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

SELECT add_continuous_aggregate_policy('bms_metrics_daily',
  start_offset => INTERVAL '3 days',
  end_offset   => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE bms_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bms_metrics_isolate ON bms_metrics;
CREATE POLICY bms_metrics_isolate ON bms_metrics
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

-- Promote the metrics table to a TimescaleDB hypertable partitioned by ts.
-- migrate_data copies any pre-existing rows into the first chunk.
-- chunk_time_interval = 1 week is a sensible default for ~15-minute ingestion cadence.
SELECT create_hypertable(
  'metrics',
  by_range('ts', INTERVAL '1 week'),
  migrate_data => true,
  if_not_exists => true
);--> statement-breakpoint

-- Hourly continuous aggregate. Back-fills 3 days on first refresh.
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_hourly
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  org_id,
  time_bucket('1 hour'::interval, ts) AS bucket,
  avg(power_kw)                       AS avg_power_kw,
  max(power_kw)                       AS max_power_kw,
  last(power_kwh, ts)                 AS last_power_kwh,
  avg(temp_c)                         AS avg_temp_c,
  max(temp_c)                         AS max_temp_c,
  avg(bandwidth_gbps)                 AS avg_bandwidth_gbps,
  max(bandwidth_gbps)                 AS max_bandwidth_gbps,
  count(*)::int                       AS sample_count
FROM metrics
GROUP BY org_id, bucket
WITH NO DATA;--> statement-breakpoint

SELECT add_continuous_aggregate_policy(
  'metrics_hourly',
  start_offset  => INTERVAL '3 days',
  end_offset    => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => true
);--> statement-breakpoint

-- Daily roll-up from the hourly aggregate (hierarchical, requires TimescaleDB ≥ 2.9).
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_daily
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  org_id,
  time_bucket('1 day'::interval, bucket) AS day,
  avg(avg_power_kw)                      AS avg_power_kw,
  max(max_power_kw)                      AS max_power_kw,
  last(last_power_kwh, bucket)           AS last_power_kwh,
  avg(avg_temp_c)                        AS avg_temp_c,
  max(max_temp_c)                        AS max_temp_c,
  avg(avg_bandwidth_gbps)                AS avg_bandwidth_gbps,
  max(max_bandwidth_gbps)                AS max_bandwidth_gbps,
  sum(sample_count)                      AS sample_count
FROM metrics_hourly
GROUP BY org_id, day
WITH NO DATA;--> statement-breakpoint

SELECT add_continuous_aggregate_policy(
  'metrics_daily',
  start_offset  => INTERVAL '90 days',
  end_offset    => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => true
);--> statement-breakpoint

-- Retain raw points for 2 years; continuous aggregates are kept indefinitely.
SELECT add_retention_policy(
  'metrics',
  INTERVAL '2 years',
  if_not_exists => true
);

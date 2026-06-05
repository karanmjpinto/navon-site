-- Runs once on first container start (docker-entrypoint-initdb.d).
-- Enables TimescaleDB in the navon_portal database so that
-- migration 0005 (bms_metrics hypertable) succeeds.

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

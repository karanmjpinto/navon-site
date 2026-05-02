-- Run once on first DB setup as a Postgres superuser.
-- Drizzle migrations handle table creation; this file is for one-time
-- extensions and the application role.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- TimescaleDB powers the time-series tables we'll add in Phase 2
-- (power, temperature, bandwidth metrics). Safe to enable now.
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Application role; password is rotated out-of-band and lives only in
-- /srv/navon/portal/.env.production on the GPU box.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'navon') THEN
    CREATE ROLE navon LOGIN PASSWORD 'CHANGE_ME';
  END IF;
END
$$;

CREATE DATABASE navon_portal OWNER navon;

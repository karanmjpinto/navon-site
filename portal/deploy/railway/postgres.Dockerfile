# Custom Postgres image for Railway — adds TimescaleDB (required for
# bms_metrics hypertables in migrations 0005 & 0006).
#
# Deploy as a separate Railway service in the same project:
#   Service name:   navon-postgres
#   Dockerfile:     portal/deploy/railway/postgres.Dockerfile
#   Root directory: portal/deploy/railway
#   Volume mount:   /var/lib/postgresql/data  → 10 GB Railway volume
#   Env vars:       POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
#
# The portal service references it via the Railway-injected DATABASE_URL
# variable (set in the Railway dashboard using the service's private URL).

FROM timescale/timescaledb:latest-pg17

# Init script runs on first start and enables the extension in the target DB.
COPY postgres-init.sql /docker-entrypoint-initdb.d/01_timescaledb.sql

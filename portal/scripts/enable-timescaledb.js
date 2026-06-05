// Runs before drizzle-kit migrate in entrypoint.sh.
// Enables the TimescaleDB extension so migrations 0005/0006 (bms_metrics
// hypertable) succeed. Idempotent — safe to run on every deploy.
// If the Postgres server doesn't have TimescaleDB installed this exits
// gracefully (migrations will then fail with a clear error message).
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE`;
  console.log("[entrypoint] TimescaleDB extension enabled.");
} catch (err) {
  console.warn(
    "[entrypoint] Could not enable TimescaleDB — make sure you're using the timescale/timescaledb:latest-pg17 image:",
    err.message
  );
} finally {
  await sql.end();
}

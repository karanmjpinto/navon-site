#!/bin/sh
# Navon Portal — Railway entrypoint
# 1. Enables TimescaleDB extension (needed by migrations 0005/0006)
# 2. Runs Drizzle migrations
# 3. Starts Next.js on the Railway-provided $PORT
set -e

echo "=== Navon Customer Portal ==="
echo "Node: $(node --version)"

echo "Enabling TimescaleDB extension..."
node --input-type=module < scripts/enable-timescaledb.js

echo "Running database migrations..."
node_modules/.bin/drizzle-kit migrate
echo "Migrations complete."

PORT="${PORT:-3002}"
echo "Starting Next.js on port $PORT..."
exec node_modules/.bin/next start -p "$PORT"

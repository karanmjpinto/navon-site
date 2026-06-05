#!/bin/sh
# Navon Portal — Railway entrypoint
# Runs Drizzle migrations then starts Next.js on the Railway-provided $PORT.
# Executed by railway.toml startCommand; not used in local docker compose.
set -e

echo "=== Navon Customer Portal ==="
echo "Node: $(node --version)"
echo "Running database migrations..."
# drizzle-kit is installed (devDep, full install in Dockerfile deps stage)
node_modules/.bin/drizzle-kit migrate
echo "Migrations complete."

PORT="${PORT:-3002}"
echo "Starting Next.js on port $PORT..."
exec node_modules/.bin/next start -p "$PORT"

# Changelog

All notable changes to Navon Portal are documented here.

---

## [v0.2.0] — 2026-05-03

### Phase 0 — Housekeeping

- **gitignore**: stop tracking `portal/db/migrations/meta/` and `portal/tsconfig.tsbuildinfo` (both are regenerated artifacts)
- **RLS**: migration 0003 adds row-level security to `memberships`, `feedback`, `feedback_attachments`, `feedback_comments`, `work_orders`, `work_order_comments` — all previously missing from the 9999 policy file

### Phase 1 — NetBox Read-Only Sync (landed on main from feature branch)

- `docker-compose.dev.yml` — local NetBox stack (port 8000) for development
- `scripts/seed-netbox.ts` — idempotent fixture seeder (2 tenants, 1 site, 2 racks, 4 devices, 2 circuits)
- `portal/lib/netbox/{client,types,mapper}.ts` — NetBox API adapter layer
- `portal/workers/netbox-sync.ts` — batch sync worker (CLI + cron + programmatic)
- `portal/lib/netbox-cron.ts` + `portal/instrumentation.ts` — 6-hourly cron via node-cron
- `portal/app/(portal)/admin/integrations/netbox/` — admin trigger UI
- migration 0002: `external_id`, `external_source`, `last_synced_at`, `archived_at` on sites/cabinets/devices/cross_connects
- 22 tests (18 mapper + 4 sync worker)

### Phase 2 — NetBox Real-Time Webhooks

- `portal/lib/netbox/apply.ts` — shared upsert/archive helpers (DRY between sync + webhook)
- `portal/app/api/integrations/netbox/webhook/route.ts` — `POST /api/integrations/netbox/webhook`:
  - HMAC-SHA512 signature verification (X-Hook-Signature header)
  - Handles `created/updated/deleted` for `dcim.site`, `dcim.rack`, `dcim.device`, `circuits.circuit`, `tenancy.tenant`, `ipam.vlan`, `ipam.prefix`, `ipam.ipaddress`
  - In-memory LRU (1000 entries) for idempotent replay
  - Audit log entry per event
- 8 webhook tests (golden payloads, sig fail, duplicate detection, missing secret)

### Phase 3 — IPAM Sync (VLANs, Prefixes, IP Addresses)

- migration 0004: `vlans`, `prefixes`, `ip_addresses` tables with RLS + partial unique indexes
- Extended mapper, apply.ts, sync worker, and webhook handler for IPAM object types
- `portal/app/(portal)/network/page.tsx` — customer-facing Network page:
  - Three tabs: IP Addresses | Prefixes | VLANs
  - Per-tab search, status badges, "synced Xh ago" timestamps
  - Empty state with account-manager contact CTA
- Admin NetBox sync results now shows IPAM row counts

### Phase 4 — BMS Metrics & Capacity Dashboard

- `portal/lib/bms/types.ts` — vendor-agnostic `BmsReading` contract (`power_kw | temp_c | humidity_pct | pue`)
- migration 0005: `bms_metrics` TimescaleDB hypertable (1-day chunks) + hourly/daily continuous aggregates + 90d raw / 2y rollup retention + RLS
- `portal/app/api/metrics/bms/route.ts` — `POST /api/metrics/bms`: auth via metrics API token, batch insert into hypertable
- `portal/lib/forecast.ts` — linear-regression OLS forecast: `linearRegression()`, `forecastCrossing()`, `formatForecast()`
- `portal/app/(portal)/capacity/page.tsx` — customer capacity dashboard:
  - Power gauge per site with % fill and colour coding (green/amber/red)
  - SVG sparkline with 7d/30d toggle
  - PUE badge
  - Linear-regression forecast: "In ~Xw at current trend" to hit 80% of allocated power
- `portal/app/(portal)/admin/bms/page.tsx` — admin BMS source health (healthy vs. stale in last 5min)
- `scripts/mock-bms.ts` — mock generator: 2 PDU sources × 4 metrics, 30s interval
- 10 forecast unit tests

---

## [v0.1.0] — 2026-05-01

Initial portal: auth (Auth.js magic-link + TOTP), multi-tenancy (orgs + RLS), sites/cabinets/devices/cross-connects, tickets + SLA, invoices + M-Pesa stub, notifications, alerts, maintenance windows, feedback + work-order flow, IPAM (ip_ranges/ip_assignments), reporting (capacity + uptime), API tokens, SAML SSO stub.

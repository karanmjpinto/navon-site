# NetBox Integration — Runbook

**Scope:** Phase 1 federation — read-only sync of sites, racks, devices, and circuits from a NetBox instance into the Navon portal.

---

## Prerequisites

- Docker + Docker Compose (for local NetBox)
- `pnpm` (portal package manager)
- Navon portal `.env.local` with `NETBOX_URL` and `NETBOX_TOKEN` set

---

## 1. Spin Up Local NetBox

```bash
# From the repo root
docker compose -f docker-compose.dev.yml up -d
```

First startup takes ~2 minutes (Django migrations + superuser creation). Check readiness:

```bash
curl -s http://localhost:8000/api/ | python3 -m json.tool | head -5
# Should return {"racks":{"...}, ...}
```

**Default credentials (dev only):**

| Field | Value |
|---|---|
| UI | http://localhost:8000 |
| Username | `admin` |
| Password | `navon-dev-2026` |
| API token | `navon-netbox-dev-00000000000000000000` |

> The API token is pre-seeded via the `SUPERUSER_API_TOKEN` env var in `docker-compose.dev.yml`. In production, create a dedicated read-only token for the sync worker.

---

## 2. Seed Fixture Data

```bash
# From repo root — seeds 1 site, 2 racks, 4 devices, 2 circuits
NETBOX_URL=http://localhost:8000 \
NETBOX_TOKEN=navon-netbox-dev-00000000000000000000 \
  pnpm tsx scripts/seed-netbox.ts
```

Expected output:

```
Seeding NetBox at http://localhost:8000 …

[tenants]
  uon: id=1
  pesa-mobile-ltd: id=2
…
✓ Seed complete.
```

The script is idempotent — rerunning it skips objects that already exist.

---

## 3. Configure the Portal

Add to `portal/.env.local`:

```env
NETBOX_URL=http://localhost:8000
NETBOX_TOKEN=navon-netbox-dev-00000000000000000000
```

**Join key:** The sync worker matches NetBox tenants to Navon orgs by `slug`. The demo seed creates tenants with slugs `uon` and `pesa-mobile-ltd`, which match the seeded Navon orgs. If you add a new customer, ensure the slug matches in both systems.

---

## 4. Apply the Schema Migration

```bash
cd portal
# Apply migration 0002 directly (same pattern as 0001)
sed 's/--> statement-breakpoint/;/g' \
  db/migrations/0002_netbox_sync_fields.sql \
  | psql -h localhost -U navon -d navon_portal
```

This adds `external_id`, `external_source`, `last_synced_at`, and `archived_at` columns to `sites`, `cabinets`, `devices`, and `cross_connects`.

---

## 5. Run the Sync

### Manual (CLI)

```bash
cd portal
pnpm sync:netbox
# or: pnpm tsx workers/netbox-sync.ts
```

### Manual (Admin UI)

1. Log in as an admin user (`wanjiru@uon.demo` / `navon-demo-2026`)
2. Navigate to **Admin → NetBox** in the top nav
3. Click **"Run sync now"**
4. A results table shows fetched / upserted / archived / errored counts per org

### Automatic (in-process cron)

The portal server registers a cron job at startup (via `instrumentation.ts`) that runs the sync every 6 hours when `NETBOX_URL` and `NETBOX_TOKEN` are set. No separate process needed.

---

## 6. Verify Results

After a sync, check the Sites page:

1. Go to **Sites** → click into a site
2. Cabinet cards show a **"from NetBox · Xh ago"** badge if synced from NetBox
3. The site header also shows the badge if the site record came from NetBox

Check the database directly:

```sql
-- Synced sites
SELECT name, code, external_id, last_synced_at FROM sites WHERE external_id IS NOT NULL;

-- Synced devices
SELECT label, vendor, model, external_id, archived_at FROM devices WHERE external_id IS NOT NULL;
```

---

## 7. What the Sync Does

Per matched org (NetBox tenant slug = Navon org slug):

1. **Sites** — fetches `GET /api/dcim/sites/?tenant_id=N`, upserts into `sites` table
2. **Racks** — fetches `GET /api/dcim/racks/?tenant_id=N`, upserts into `cabinets` table; requires a matching site to resolve the `site_id` FK
3. **Devices** — fetches `GET /api/dcim/devices/?tenant_id=N`, upserts into `devices` table; devices without a rack assignment are skipped
4. **Circuits** — fetches `GET /api/circuits/circuits/?tenant_id=N`, upserts into `cross_connects` table
5. **Soft-deletes** — devices and cabinets absent from the current sync response get `archived_at = now()`. Un-archived if they reappear.
6. **Audit log** — one `audit_events` row per run with counts per org

Upsert key: `(org_id, external_id)` where `external_id = "netbox:<nb_object_id>"`.  
Manually-created rows (null `external_id`) are never touched by the sync.

---

## 8. Production Setup

### API Token (read-only)

In NetBox admin: **Admin → API Tokens → Add** — create a token for a dedicated `navon-sync` user with read-only permissions on DCIM, IPAM, Circuits, and Tenancy.

### Environment Variables

```env
# On the GPU box, in /srv/navon/portal/.env.production
NETBOX_URL=http://127.0.0.1:8000   # or https://netbox.internal if separate host
NETBOX_TOKEN=<production-token>
```

### Caddy (if NetBox is on a separate port, don't expose it publicly)

NetBox is an internal tool. If co-located on the GPU box:

```
netbox.internal {
  bind 127.0.0.1   # localhost only
  reverse_proxy 127.0.0.1:8000
}
```

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "no tenant/org slug matches found" | NetBox tenant slugs don't match Navon org slugs | Align slugs in both systems; check `SELECT slug FROM orgs` and NetBox `/api/tenancy/tenants/` |
| `NETBOX_URL and NETBOX_TOKEN must be set` | Missing env vars | Add to `.env.local`; restart server |
| Sync runs but devices are skipped | Devices have no rack assigned in NetBox | Assign all devices to a rack in NetBox |
| "NetBox 404" errors | Wrong base URL or NetBox not running | Check `curl http://localhost:8000/api/` |
| Sync doesn't run automatically | `NETBOX_URL` not set at server start time | Check logs for `[netbox-cron] NETBOX_URL/TOKEN not set` |
| Cabinet cards show no badge | Site/cabinets created before migration 0002 | Run the migration and re-sync |

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | Local NetBox + Redis + Postgres stack |
| `scripts/seed-netbox.ts` | Idempotent fixture seeder |
| `portal/lib/netbox/types.ts` | TypeScript types for NetBox API responses |
| `portal/lib/netbox/client.ts` | Thin fetch wrapper (`NetBoxClient`) |
| `portal/lib/netbox/mapper.ts` | Pure mapping functions (NetBox → Navon schema) |
| `portal/workers/netbox-sync.ts` | Sync worker — runnable as CLI or imported |
| `portal/lib/netbox-cron.ts` | `node-cron` scheduler (every 6h) |
| `portal/instrumentation.ts` | Next.js server startup hook — registers cron |
| `portal/app/(portal)/admin/integrations/netbox/page.tsx` | Admin UI — manual sync trigger + results |
| `portal/app/(portal)/admin/integrations/netbox/actions.ts` | Server action backing the UI |
| `portal/db/migrations/0002_netbox_sync_fields.sql` | Schema migration (external_id columns) |
| `portal/lib/netbox/mapper.test.ts` | Unit tests for mapper functions |
| `portal/workers/netbox-sync.test.ts` | Integration tests for sync worker |

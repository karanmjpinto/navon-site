# NetBox + openDCIM Integration Strategy

**Author:** Karan Pinto / Claude Code — 2026-05-03  
**Status:** Draft for review

---

## Summary

**Recommendation in one sentence: Federate with NetBox as the operator's DCIM/IPAM source of truth, and run Navon Portal as the customer-facing layer on top of it — one product, two tiers.**

openDCIM should be ruled out immediately: its primary maintainer is retiring, it has no REST API, no multi-tenancy, and is licensed GPL v3. It is not a viable integration partner. NetBox is the opposite: actively maintained, Apache 2.0, industry-standard, with an excellent REST API and Python SDK. Navon already has the things NetBox will never build — billing, M-Pesa/STK push, customer-scoped multi-tenancy, support tickets, SLA reporting, in-app notifications, SAML SSO for end-users. The cleanest architecture is: the operator team runs NetBox internally as their infra database; Navon syncs the customer-visible slice (racks, devices, circuits, IPs) via a nightly worker, and is the only surface customers ever see. This is not two products — it is one product (Navon Portal) with a defined data dependency.

---

## What NetBox Covers

**Repo:** https://github.com/netbox-community/netbox  
**License:** Apache 2.0  
**Status:** Actively maintained, large community, 17k+ stars

### Data Model — App Areas

| App | Objects | Notable Detail |
|-----|---------|----------------|
| **DCIM** | Sites, Locations, Racks, Devices, Device Types, Manufacturers, Interfaces, Power Ports, Power Feeds, PDUs, Cables, Console Ports, Patch Panels | Rack unit elevation tracking, cable tracing, front/rear port modeling |
| **IPAM** | VRFs, Route Targets, Prefixes, IP Ranges, IP Addresses, VLANs, VLAN Groups, ASNs, FHRPs | Full BGP/OSPF context, prefix utilisation %, role + status per address |
| **Circuits** | Providers, Provider Networks, Circuits, Circuit Terminations | Circuit type, speed, commit rate, status (planned/provisioned/offline) |
| **Tenancy** | Tenants, Tenant Groups, Contacts, Contact Groups, Contact Assignments | Tenants can be linked to racks/devices/prefixes for chargeback-style attribution |
| **Virtualization** | Cluster Types, Clusters, Virtual Machines, VM Interfaces | Hypervisor resource tracking |
| **Wireless** | Wireless LANs, Wireless LAN Groups, Access Points | 802.11 standards, channel, auth mode |
| **Organization** | Regions, Sites, Locations (nested) | Hierarchical: Region → Site → Location → Rack |
| **Extras** | Custom Fields, Custom Links, Webhooks, Tags, Config Contexts, Config Templates (Jinja2), Journals, Change Log | Every object has a journal (change history), webhooks fire on any change |

### REST API

- Pattern: `GET /api/dcim/racks/?site_id=1&tenant_id=5&limit=50`
- Every resource: list, retrieve, create, update, partial-update, delete, OPTIONS
- Consistent `results[]` / `count` / `next` / `previous` pagination envelope
- Token auth: `Authorization: Token <api-token>` header
- **pynetbox SDK** (Python): `nb = pynetbox.api("https://netbox.example.com", token="…")` — returns lazy-loaded record objects

### What NetBox Does NOT Do

- **No customer-facing portal** — the UI is for infrastructure engineers, not end-users
- **No billing or invoicing** — tenancy exists but no charge-line model
- **No payment processing** — no M-Pesa, Stripe, or any payment rail
- **No customer-scoped auth** — RBAC is for admin users, not org-isolated customer accounts
- **No support ticketing** — no ticket model; some orgs bolt on external issue trackers via webhooks
- **No SLA tracking or SLA-gated reporting** — no uptime %, no availability dashboard
- **No in-app notifications** — no notification feed, no read/unread state per user
- **No real-time sensor monitoring** — records exist but no live power/temp/bandwidth ingestion pipeline
- **No mobile-payments integration** — no emerging-markets payment primitives
- **No SAML SSO for customers** — NetBox supports LDAP/OAuth for admin staff, not end-user portals

---

## What openDCIM Covers

**Repo:** https://github.com/opendcim/openDCIM  
**License:** GPL v3 (copyleft — embedding in a proprietary product is legally problematic)  
**Status:** ⚠️ Effectively end-of-life. Primary maintainer (Scott Milleken) has announced retirement and domain wind-down. Last significant release v23.04 (October 2023). Seeking new maintainers as of 2024.

### Data Model — Physical Focus

| Object | Detail |
|--------|--------|
| Cabinets / Racks | Physical dimensions, weight capacity, power capacity (kW), aisle/row position |
| Devices | Asset tracking, serial numbers, model/manufacturer, depreciation, archive/retire lifecycle |
| Power | PDUs, power panels, circuit breakers, power distribution hierarchy |
| Cooling | Cooling units, CRAC/CRAH, SNMP polling for live temperature sensors |
| Floor Plans | Visual 2D data center floor layout with cabinet placement |
| Cabling | Fiber and copper cable runs, switch port mappings |
| Departments | Basic cost-centre ownership of devices (no real multi-tenancy) |

### What openDCIM Does NOT Do

- **No REST API** — no JSON API; integration is via direct MySQL queries or screen-scraping
- **No IPAM** — no IP address management whatsoever
- **No multi-tenancy** — single-org deployment; departments ≠ customer isolation
- **No billing** — cost tracking only via depreciation/asset value
- **No customer portal** — pure internal tool
- **No circuit/carrier management** — no provider/circuit model

### Verdict

openDCIM's physical floor plan and SNMP cooling/power integration are genuinely useful features NetBox lacks. But the absence of a REST API, the GPL v3 license, and the maintenance trajectory make it a dead end for integration. Its unique strengths (floor plans, live SNMP cooling) are better addressed through a dedicated BMS/DCIM sensor layer feeding Navon's metrics API directly.

---

## Side-by-Side with Navon

### Schema Comparison

| Concern | NetBox model(s) | openDCIM | Navon table(s) | Verdict |
|---------|----------------|----------|----------------|---------|
| Data-centre sites | `dcim.Site` (+ Region, Location) | DataCenter | `sites` (id, orgId, code, address, country) — [schema.ts:371](../../portal/db/schema.ts#L371) | Navon is thin; NetBox has region hierarchy. **Defer to NetBox; sync name/code.** |
| Racks / cabinets | `dcim.Rack` (U height, weight, power, depth, mounting) | Cabinet (power, cooling, floor pos) | `cabinets` (rackUnits, powerCapKw, status) — [schema.ts:390](../../portal/db/schema.ts#L390) | NetBox is richer. Navon's `cabinets` becomes a customer-facing projection. |
| Devices | `dcim.Device` (type, manufacturer, platform, interfaces, primary IP) | Device (serial, depreciation) | `devices` (label, vendor, model, serial, role, rackUStart, rackUSize) — [schema.ts:414](../../portal/db/schema.ts#L414) | Near-identical at the fields Navon shows. Navon's model is a reasonable customer-visible subset. **Sync from NetBox; add `netbox_id` FK.** |
| Cables / cabling | `dcim.Cable` (type, color, length, trace) | Yes (fiber/copper) | ❌ not modeled | **Pure NetBox territory. Don't build this in Navon.** |
| IPAM — ranges/prefixes | `ipam.Prefix` (VRF, site, VLAN, role, utilisation) | ❌ | `ip_ranges` (cidr, vlanId, gateway) — [schema.ts: ~510](../../portal/db/schema.ts) | NetBox is strictly better for full IPAM. Navon's basic ranges serve the customer portal view. **Sync customer-visible prefixes from NetBox.** |
| IPAM — address assignments | `ipam.IPAddress` (DNS name, NAT, status, role) | ❌ | `ip_assignments` (address, deviceId) | Same pattern — NetBox is the authority; Navon mirrors for display. |
| Circuits / cross-connects | `circuits.Circuit` (provider, type, speed, commit rate, status) | ❌ | `cross_connects` (fromCabinetId, toLabel, speedGbps, media, status) — [schema.ts:439](../../portal/db/schema.ts#L439) | Navon's cross-connect model is functional for customer display. **Augment with NetBox circuit status on sync.** |
| VLANs | `ipam.VLAN` (vid, name, site, tenant) | ❌ | ❌ | **NetBox only. Not customer-visible in current scope.** |
| Power monitoring | ❌ (no live ingestion) | SNMP live | `metrics` (powerKw, powerKwh, tempC, bandwidthGbps via TimescaleDB) | **Navon's metrics API is the right home for sensor data.** BMS/DCIM agents post to `/api/metrics`. |
| Cooling | ❌ | SNMP live | ❌ | Feed through Navon metrics API as `tempC`. No separate model needed. |
| Floor plans | ❌ | Yes (2D visual) | ❌ | Nice-to-have; out of scope for current phase. |
| Multi-tenancy (customer isolation) | Tenant model (attribution, not portal isolation) | ❌ | `orgs` + `memberships` + RLS — [schema.ts:146](../../portal/db/schema.ts#L146) | **Navon is strictly better. NetBox has no concept of customer-scoped data isolation.** |
| Billing / invoicing | ❌ | ❌ | `invoices` + `invoice_lines` + PDF + CSV + KES minor-unit — [schema.ts:282](../../portal/db/schema.ts#L282) | **Navon only.** |
| M-Pesa / STK push | ❌ | ❌ | `mpesa_payments` + `lib/daraja.ts` | **Navon only.** Unique to emerging-market ops. |
| Support tickets + SLA | ❌ | ❌ | `tickets` + `ticket_comments` + `slaDueAt` — [schema.ts:233](../../portal/db/schema.ts#L233) | **Navon only.** |
| In-app notifications | ❌ | ❌ | `notifications` — [schema.ts:463](../../portal/db/schema.ts#L463) | **Navon only.** |
| Feedback → work orders | ❌ | ❌ | `feedback` + `work_orders` (migration 0001) | **Navon only.** |
| Audit trail | ✅ Change Log (every object, full diff) | ❌ | `audit_events` — [schema.ts:329](../../portal/db/schema.ts#L329) | Both have it. NetBox's is deeper per-object; Navon's is portal-action scoped. No conflict. |
| SAML SSO (for end-users) | ❌ (supports LDAP/OAuth for admin staff) | ❌ | `lib/saml.ts` + SAML ACS route (Phase 2) | **Navon only.** |
| TOTP / MFA | ❌ | ❌ | `users.totpSecret` + `lib/totp.ts` — [schema.ts:163](../../portal/db/schema.ts#L163) | **Navon only.** |
| Webhook / event bus | ✅ (webhooks on any model change) | ❌ | ❌ | **Use NetBox webhooks to trigger Navon sync in Phase 2.** |

### Where We're Duplicating (and it's fine)

Navon's `sites`, `cabinets`, `devices`, `ip_ranges`, `ip_assignments`, and `cross_connects` tables overlap with NetBox's DCIM/IPAM models. This duplication is **intentional** once the federation pattern is in place: Navon holds the customer-visible projection, NetBox holds the operator's full detail. The sync worker is the seam. The Navon tables don't need to become as rich as NetBox's — they need to be accurate enough for a customer portal.

---

## Integration Options, Ranked

### Option 1 — Federate (Recommended)

**Pattern:** NetBox is the operator's DCIM/IPAM source of truth. Navon is the customer portal. A lightweight sync worker pulls customer-visible infra data from NetBox's REST API into Navon's existing tables on a schedule (or event-driven via NetBox webhooks).

**What changes in Navon's schema:**
```sql
-- Add netbox_id columns to DCIM tables for FK back to NetBox
ALTER TABLE sites    ADD COLUMN netbox_id integer;
ALTER TABLE cabinets ADD COLUMN netbox_id integer;
ALTER TABLE devices  ADD COLUMN netbox_id integer;
ALTER TABLE ip_ranges ADD COLUMN netbox_prefix_id integer;
ALTER TABLE cross_connects ADD COLUMN netbox_circuit_id integer;
```

**New files/workers:**
- `portal/workers/netbox-sync.ts` — Node.js cron; calls `/api/dcim/racks/`, `/api/dcim/devices/`, `/api/circuits/circuits/` filtered by tenant tag matching `org.slug`; upserts into Navon tables
- `portal/lib/netbox.ts` — typed fetch wrapper for NetBox REST API (`NETBOX_URL` + `NETBOX_TOKEN` env vars)
- `.env.example` additions: `NETBOX_URL`, `NETBOX_TOKEN`

**What breaks:** Nothing. The portal pages (`/sites`, `/cabinets/[id]`, `/sites/[id]/ipam`) already read from Navon's tables. The sync worker just keeps those tables populated from the authoritative source instead of requiring manual entry.

**Pros:**
- Each tool does what it's best at
- Operator team gets NetBox's full cable/circuit/VLAN depth internally
- Customers see a clean, purpose-built portal — never the NetBox UI
- No tech-stack mixing (NetBox is Django/Python; Navon stays Next.js/Node)
- NetBox's webhooks can trigger near-real-time sync in Phase 2
- Apache 2.0 — no license complications

**Cons:**
- Two systems to deploy and keep running
- Sync lag (nightly in Phase 1; near-real-time only in Phase 2)
- Operator must maintain tenant/tag discipline in NetBox for the sync filter to work

**Time estimate:** Phase 1 sync (racks + devices) — 1 week. Full sync with circuits + IPAM — 2–3 weeks.

**Dependency risk:** Low. NetBox REST API is stable and versioned. The sync worker failing degrades to stale data, not a portal outage.

---

### Option 2 — Coexist with Sync (Conservative)

**Pattern:** Same as Option 1 but without replacing manual data entry. The sync worker runs opportunistically; operators can still create cabinets/devices in Navon directly. NetBox data wins on conflict.

**Difference from Option 1:** No hard dependency on NetBox being up. Good for a transitional period while the operator migrates their inventory into NetBox.

**What changes:** Same schema additions (nullable `netbox_id` columns), but Navon forms for creating cabinets/devices remain active.

**Pros:** Safe, incremental, no forced NetBox adoption.  
**Cons:** Schema confusion — some records have `netbox_id`, others don't. Eventually messy.

**Time estimate:** 1 week. Basically Phase 1 of Option 1 without deprecating manual entry.

---

### Option 3 — Embed / Own (Avoid)

**Pattern:** Fork or deploy NetBox alongside Navon. Replace Navon's thin DCIM tables entirely with NetBox's data model. Build the customer portal as a Django app on top of NetBox's ORM.

**What this means in practice:**
- Rewrite `sites`, `cabinets`, `devices`, `cross_connects`, `ip_ranges`, `ip_assignments` pages to query NetBox's DB directly or via internal API
- Implement Navon's customer auth, billing, and RLS on top of a Django project
- Maintain a fork of NetBox or upstream via plugins

**Pros:** Single database, no sync lag, full NetBox depth immediately.

**Cons:**
- Massive stack change: Next.js → Django, Drizzle/Postgres → NetBox ORM, Auth.js → custom Django auth
- NetBox's RBAC is not designed for customer-portal multi-tenancy; you'd build that from scratch in a new framework
- Navon's billing, M-Pesa, and notification systems would have to be ported to Python/Django
- NetBox plugin API is powerful but complex; customer portal scope is far outside what plugins are designed for
- Risk of being stuck on a NetBox version due to plugin API breakage

**Time estimate:** 2–3 months minimum to reach feature parity with current Navon. High risk.

**Verdict: Don't do this.** You'd be giving up Navon's biggest advantages (billing, M-Pesa, customer auth, multi-tenancy) just to get NetBox's cable tracing — which customers don't need anyway.

---

### Option 4 — Ignore Both

**Pattern:** Keep building Navon's own DCIM/IPAM without external dependency.

**Pros:** No integration complexity, full control, single codebase.

**Cons:** You will spend 6–12 months building things NetBox already does well — cable management, circuit status, full IPAM with VRF/BGP context, change history per device. Customers probably don't need that depth, but *operators* do, and if your ops team is running on spreadsheets, that's a quality problem that reflects on the portal's data accuracy.

**Verdict:** Reasonable if Navon is being sold to operators who will never adopt NetBox. Not reasonable if the goal is "best out there" — you'd be re-inventing a mature tool to own a problem that isn't Navon's differentiator.

---

## Recommendation

**Federate with NetBox. Skip openDCIM entirely. This is one product.**

The architecture is:

```
┌─────────────────────────────────────────────────────────┐
│  Customers                                               │
│  (portal.navonworld.com)                                 │
│                                                          │
│  Navon Portal  ←─── THE product                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Auth (credentials, TOTP, SAML)                  │   │
│  │  Multi-tenancy (orgs, memberships, RLS)           │   │
│  │  Billing (invoices, PDF, CSV, M-Pesa STK)        │   │
│  │  Support tickets + SLA tracking                  │   │
│  │  Asset view (sites/racks/devices — synced)       │   │
│  │  IPAM view (prefixes/IPs — synced)               │   │
│  │  Circuit status (synced)                         │   │
│  │  Real-time metrics (power/temp/bandwidth)        │   │
│  │  In-app notifications + feedback→work order      │   │
│  └──────────────┬───────────────────────────────────┘   │
└─────────────────│───────────────────────────────────────┘
                  │  nightly sync (Phase 1)
                  │  webhook-triggered (Phase 2)
┌─────────────────▼───────────────────────────────────────┐
│  Operator team only (internal)                           │
│                                                          │
│  NetBox                                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Full DCIM (racks, devices, cables, interfaces)  │   │
│  │  Full IPAM (VRFs, prefixes, VLANs, ASNs)         │   │
│  │  Circuits (providers, terminations, status)      │   │
│  │  Tenancy (maps to Navon orgs via tag/slug)       │   │
│  │  Change log (every infrastructure change)        │   │
│  │  Webhooks → trigger Navon sync                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Why "one product, not two":** Navon Portal *is* the product you sell to customers. NetBox is an internal operational tool (like Postgres is infrastructure, not a product). You don't sell NetBox — operators use it the same way they'd use a spreadsheet or Jira. The value proposition of Navon is the customer-facing layer: billing, M-Pesa, multi-tenancy, SLA visibility, notifications. That is not something you'd want to split into a separate product — it's the whole point.

**Why not openDCIM:** No API, GPL v3, maintenance uncertainty. Cross it off the list today.

**The edge Navon has that neither NetBox nor openDCIM will build:**
1. Emerging-market payment rails (M-Pesa STK push, KES billing)
2. Customer-portal multi-tenancy (org-scoped RLS, per-user TOTP/SAML)
3. In-app notification feed, SLA tracking, ticket management
4. Mobile-first UI appropriate for Kenyan bandwidth conditions
5. Feedback → work order internal loop (shipping faster than any open-source DCIM)

These are defensible differentiators. The IPAM/cabling depth that NetBox has is *not* your differentiator — it's table stakes for the operator back-office.

---

## Phased Plan

### Phase 1 — Read-Only Rack + Device Sync (1 week)

**Goal:** Operator enters racks and devices in NetBox; Navon portal displays them without manual double-entry.

**Schema migration** (`portal/db/migrations/0002_netbox_ids.sql`):
```sql
ALTER TABLE sites     ADD COLUMN netbox_site_id    integer;
ALTER TABLE cabinets  ADD COLUMN netbox_rack_id    integer;
ALTER TABLE devices   ADD COLUMN netbox_device_id  integer;
CREATE UNIQUE INDEX sites_netbox_idx    ON sites    (netbox_site_id) WHERE netbox_site_id IS NOT NULL;
CREATE UNIQUE INDEX cabinets_netbox_idx ON cabinets (netbox_rack_id) WHERE netbox_rack_id IS NOT NULL;
CREATE UNIQUE INDEX devices_netbox_idx  ON devices  (netbox_device_id) WHERE netbox_device_id IS NOT NULL;
```

**New files:**
- `portal/lib/netbox.ts` — fetch wrapper with typed responses for racks and devices
- `portal/workers/netbox-sync.ts` — runnable script: fetch racks/devices filtered by tenant tag = `org.slug`, upsert into Navon tables by `netbox_rack_id` / `netbox_device_id`
- `.env.example` — add `NETBOX_URL` and `NETBOX_TOKEN`

**Mapping logic (NetBox → Navon):**

| NetBox field | Navon column |
|---|---|
| `rack.site.name` | `sites.name` |
| `rack.site.slug` | `sites.code` |
| `rack.id` | `cabinets.netbox_rack_id` |
| `rack.name` | `cabinets.label` |
| `rack.u_height` | `cabinets.rackUnits` |
| `rack.powerfeed_set[0].supply.amperage × voltage / 1000` | `cabinets.powerCapKw` (approximate) |
| `device.id` | `devices.netbox_device_id` |
| `device.name` | `devices.label` |
| `device.device_type.manufacturer.name` | `devices.vendor` |
| `device.device_type.model` | `devices.model` |
| `device.serial` | `devices.serial` |
| `device.position` | `devices.rackUStart` |
| `device.device_type.u_height` | `devices.rackUSize` |
| `device.device_role.slug` (server→compute, switch→network, storage→storage) | `devices.role` |

**Affected portal routes:** None — existing pages (`/sites`, `/sites/[id]`, `/cabinets/[id]`) already query these tables.

**Run as:** `pnpm tsx portal/workers/netbox-sync.ts` from cron (nightly at 02:00). Or deploy as a systemd timer alongside `navon-portal.service`.

---

### Phase 2 — Webhook-Triggered Sync + Circuit Status (2 weeks)

**Goal:** Changes in NetBox appear in the portal within seconds, not 24 hours. Cross-connect/circuit status is kept in sync.

**What to add:**
- New API route: `portal/app/api/webhooks/netbox/route.ts` — POST endpoint, validates `X-NetBox-Signature` HMAC, enqueues a targeted re-sync for the changed object type (rack / device / circuit)
- Extend `netbox-sync.ts` to accept a `--target rack:42` argument for targeted resync
- Extend `cross_connects` sync: `GET /api/circuits/circuits/?tenant={slug}` → map status `active → provisioned`, `offline → decommissioned`, `planned → pending`
- Add `netbox_circuit_id` column to `cross_connects`

**NetBox webhook config** (operator sets this up once in NetBox admin):
- URL: `https://portal.navonworld.com/api/webhooks/netbox`
- Conditions: created/updated/deleted on Rack, Device, Circuit
- Secret: shared with `NETBOX_WEBHOOK_SECRET` env var

**No customer-facing UI change needed** — `/sites/[id]` already shows cross-connects.

---

### Phase 3 — IPAM Sync (1 week)

**Goal:** IP ranges and assignments displayed in the portal come from NetBox, not manual entry.

**What to add:**
- Extend `netbox-sync.ts` to fetch `GET /api/ipam/prefixes/?tenant={slug}` and `GET /api/ipam/ip-addresses/?tenant={slug}`
- Upsert into `ip_ranges` and `ip_assignments` by a new `netbox_prefix_id` / `netbox_address_id` column
- `portal/app/(portal)/sites/[id]/ipam` — existing route, no UI change needed

**Migration** (`0003_netbox_ipam_ids.sql`):
```sql
ALTER TABLE ip_ranges      ADD COLUMN netbox_prefix_id  integer;
ALTER TABLE ip_assignments ADD COLUMN netbox_address_id integer;
```

---

### Phase 4 — Power + Capacity Metrics from BMS (1–2 weeks, no NetBox dependency)

**Goal:** Real-time power/temp/bandwidth data flowing into the portal's capacity and uptime reports.

NetBox doesn't do live sensor monitoring. openDCIM's SNMP integration isn't usable (no API). The right path is a lightweight DCIM agent (already scaffolded at `portal/scripts/dcim-agent.ts`) that polls SNMP from PDUs/BMS sensors and posts to Navon's `/api/metrics` endpoint.

**What to add/complete:**
- Finish `portal/scripts/dcim-agent.ts` — implement the `snmpPoll()` loop, posting to `/api/metrics` with a `NAVON_METRICS_TOKEN`
- Add per-cabinet metrics: extend `metrics` schema with `cabinetId` column so power/temp is tracked at rack granularity, not just org granularity
- `/reports/capacity` — replace stub with real chart (power utilisation per cabinet vs `cabinets.powerCapKw`)

**No NetBox involvement.** This is purely Navon + BMS hardware.

---

## Open Questions

1. **NetBox deployment:** Does Navon (as the operator) run their own NetBox instance, or will a hosted NetBox Cloud account be used? This affects `NETBOX_URL` and network topology.

2. **Tenant tagging convention:** The sync filter relies on `org.slug` matching a NetBox tenant slug. Is the operator prepared to maintain this tagging discipline in NetBox for all their customers?

3. **Historical circuit data:** NetBox's circuit model tracks current status. For SLA uptime calculations in Navon's `/reports/uptime`, we'd need to store state-change timestamps. Should NetBox webhooks write circuit status change events to `audit_events`?

4. **openDCIM floor plan data:** If the operator already has physical floor plan data in an openDCIM instance, the one-time migration path is: export to CSV → import into NetBox's Location/Rack models via pynetbox. This is a one-off migration, not an ongoing integration.

5. **Data ownership on conflict:** If an operator creates a cabinet in Navon directly (before NetBox is adopted), and then a NetBox sync runs — what wins? Proposed rule: NetBox wins on `netbox_rack_id`-matched rows; manual Navon-only rows (null `netbox_rack_id`) are untouched.

6. **License check for distribution:** NetBox is Apache 2.0. No issues with building a closed-source portal that calls its API. openDCIM GPL v3 — confirmed: do not embed, link, or distribute derivative works.

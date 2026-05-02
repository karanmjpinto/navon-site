# Navon Customer Portal

The customer-facing portal for Navon data centre services. Self-hosted on Navon's GPU box at `portal.navonworld.com`. The marketing site at the apex (`navonworld.com`) is unrelated and stays as static HTML.

Stack: Next.js 15 + TypeScript + Tailwind + Auth.js v5 + Drizzle + Postgres (TimescaleDB extension).

See [the v1 plan](../../.claude/plans/i-need-to-add-wild-panda.md) for scope and architecture rationale.

## Local development

Prerequisites: Node 20+, pnpm 9+, Postgres 16 with TimescaleDB.

```bash
# 1. Bring up Postgres locally (Docker option)
docker run --name navon-pg -e POSTGRES_USER=navon -e POSTGRES_PASSWORD=navon \
  -e POSTGRES_DB=navon_portal -p 5432:5432 -d timescale/timescaledb:latest-pg16

# 2. Install + configure
cd portal
pnpm install
cp .env.example .env.local
# fill AUTH_SECRET (openssl rand -base64 32), AUTH_RESEND_KEY, EMAIL_FROM

# 3. Apply schema
pnpm db:generate   # only when schema.ts changes
pnpm db:migrate

# 4. Run
pnpm dev
```

Open http://localhost:3000 → redirects to `/login`. Use `/signup` to create an account; you'll land on `/dashboard`.

## Project layout

```
portal/
├── app/
│   ├── (auth)/{login,signup}/page.tsx   ← public auth flows
│   ├── (portal)/                         ← gated by middleware
│   │   ├── layout.tsx                    ← top nav + sign out
│   │   └── dashboard/page.tsx            ← placeholder metrics
│   └── api/auth/[...nextauth]/route.ts   ← Auth.js handlers
├── db/
│   ├── schema.ts                         ← orgs, users, memberships, Auth.js tables
│   └── index.ts                          ← Drizzle client
├── lib/
│   ├── auth.ts                           ← Auth.js v5 config
│   ├── password.ts                       ← bcrypt helpers
│   ├── rbac.ts                           ← role gates
│   └── tenant.ts                         ← per-user org resolution
└── middleware.ts                         ← unauth → /login redirect
```

## Production deploy (high level)

The GPU box runs three long-lived services as systemd units:

1. **Postgres 16 + TimescaleDB** — database. See [`deploy/postgres/init.sql`](../deploy/postgres/init.sql) for one-time setup.
2. **Caddy 2** — TLS termination + reverse proxy. See [`deploy/Caddyfile`](../deploy/Caddyfile).
3. **Next.js (this app)** — see [`deploy/systemd/navon-portal.service`](../deploy/systemd/navon-portal.service).

Deploy is currently manual:

```bash
ssh navon@gpu-box
cd /srv/navon/portal
git pull
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate
sudo systemctl restart navon-portal
```

GitHub Actions automation is on the roadmap.

## What's not built yet (Phase 2+)

- TOTP MFA enforcement (column exists, UI pending)
- Tickets / service requests
- Billing view + invoice PDF generation
- Audit log surface
- SAML SSO (planned for first university customer)
- Real metrics ingestion (DCIM/BMS integration)
- M-Pesa Daraja payment integration

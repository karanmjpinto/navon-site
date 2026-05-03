-- Migration 0004: IPAM tables synced from NetBox
-- New tables: vlans, prefixes, ip_addresses — all org-scoped.
-- Upsert key: (org_id, external_id) with a partial unique index
-- matching the pattern from 0002 (external_id IS NOT NULL).

-- ── VLANs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "vlans" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "site_id"         uuid REFERENCES "sites"("id") ON DELETE SET NULL,
  "vid"             integer NOT NULL,
  "name"            text NOT NULL,
  "status"          text NOT NULL DEFAULT 'active',
  "description"     text,
  "external_id"     text,
  "external_source" "external_source",
  "last_synced_at"  timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "vlans_org_idx" ON "vlans" ("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "vlans_external_id_idx"
  ON "vlans" ("org_id", "external_id")
  WHERE "external_id" IS NOT NULL;

-- ── Prefixes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "prefixes" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "site_id"         uuid REFERENCES "sites"("id") ON DELETE SET NULL,
  "vlan_id"         uuid REFERENCES "vlans"("id") ON DELETE SET NULL,
  "prefix"          text NOT NULL,
  "status"          text NOT NULL DEFAULT 'active',
  "role"            text,
  "description"     text,
  "is_pool"         boolean NOT NULL DEFAULT false,
  "external_id"     text,
  "external_source" "external_source",
  "last_synced_at"  timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "prefixes_org_idx" ON "prefixes" ("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "prefixes_external_id_idx"
  ON "prefixes" ("org_id", "external_id")
  WHERE "external_id" IS NOT NULL;

-- ── IP Addresses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ip_addresses" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "prefix_id"       uuid REFERENCES "prefixes"("id") ON DELETE SET NULL,
  "device_id"       uuid REFERENCES "devices"("id") ON DELETE SET NULL,
  "address"         text NOT NULL,
  "status"          text NOT NULL DEFAULT 'active',
  "dns_name"        text,
  "description"     text,
  "external_id"     text,
  "external_source" "external_source",
  "last_synced_at"  timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ip_addresses_org_idx" ON "ip_addresses" ("org_id");
CREATE INDEX IF NOT EXISTS "ip_addresses_prefix_idx" ON "ip_addresses" ("prefix_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ip_addresses_external_id_idx"
  ON "ip_addresses" ("org_id", "external_id")
  WHERE "external_id" IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE vlans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vlans_isolate ON vlans;
CREATE POLICY vlans_isolate ON vlans
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

ALTER TABLE prefixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prefixes_isolate ON prefixes;
CREATE POLICY prefixes_isolate ON prefixes
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

ALTER TABLE ip_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ip_addresses_isolate ON ip_addresses;
CREATE POLICY ip_addresses_isolate ON ip_addresses
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

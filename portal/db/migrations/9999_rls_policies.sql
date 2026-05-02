-- Apply AFTER drizzle-kit migrations (filename ordered last on purpose).
-- Defence-in-depth: every tenant-scoped table denies access unless the
-- per-request setting `app.current_org_id` matches the row's org_id.
-- Set by lib/tenant.ts withOrgContext() before each query.

-- Helper: read current org from the session, return NULL if unset.
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Convenience: apply tenant-isolation policy to a table in one line.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'tickets',
    'ticket_comments',
    'invoices',
    'invoice_lines',
    'metrics_seed',
    'sites',
    'cabinets',
    'devices',
    'cross_connects',
    'notifications',
    'invites',
    'metrics_tokens',
    'mpesa_payments',
    'ip_ranges',
    'ip_assignments',
    'alert_rules',
    'alert_events',
    'maintenance_windows'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_isolate', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org())',
      t || '_isolate', t
    );
  END LOOP;
END
$$;

-- Audit events: writable from any context (audit must record cross-tenant
-- events like failed logins) but readable only within the org.
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_events_read ON audit_events;
CREATE POLICY audit_events_read ON audit_events FOR SELECT
  USING (org_id IS NULL OR org_id = app_current_org());
DROP POLICY IF EXISTS audit_events_write ON audit_events;
CREATE POLICY audit_events_write ON audit_events FOR INSERT
  WITH CHECK (true);

-- The `navon` application role is NOT a superuser, so RLS applies.
-- The DB owner / migration role bypasses RLS so seeding still works.

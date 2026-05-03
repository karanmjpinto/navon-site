-- Extend RLS to tables added in migration 0001 (feedback / work-order flow)
-- and memberships (which 9999_rls_policies.sql omitted).
--
-- Pattern matches the rest of the codebase: rows are visible only when
-- app.current_org_id (set by withOrgContext) matches the row's org_id.
-- The DB owner / migration role bypasses RLS so seeding still works.

-- ── memberships ───────────────────────────────────────────────────
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memberships_isolate ON memberships;
CREATE POLICY memberships_isolate ON memberships
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

-- ── feedback flow ─────────────────────────────────────────────────
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feedback_isolate ON feedback;
CREATE POLICY feedback_isolate ON feedback
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feedback_attachments_isolate ON feedback_attachments;
CREATE POLICY feedback_attachments_isolate ON feedback_attachments
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feedback_comments_isolate ON feedback_comments;
CREATE POLICY feedback_comments_isolate ON feedback_comments
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

-- ── work orders ───────────────────────────────────────────────────
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_orders_isolate ON work_orders;
CREATE POLICY work_orders_isolate ON work_orders
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

ALTER TABLE work_order_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_order_comments_isolate ON work_order_comments;
CREATE POLICY work_order_comments_isolate ON work_order_comments
  USING  (org_id = app_current_org())
  WITH CHECK (org_id = app_current_org());

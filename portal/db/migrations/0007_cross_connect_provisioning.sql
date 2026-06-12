-- Cross-connect self-service provisioning + commercials.
--
-- The cross_connects table already exists (0000) with RLS (9999). This adds:
--   * connection_type   — counterparty class (cloud/carrier/customer/internal/ix)
--   * z_side_provider    — counterparty name (eg "AWS", "Safaricom")
--   * install_fee_minor  — one-time NRC in minor units (cents)
--   * monthly_charge_minor — recurring MRC in minor units
--   * notes              — free-form request notes
--   * requested_by       — user who raised the request
--   * decommissioned_at  — set when a connect is torn down
--
-- No new RLS needed: cross_connects is already isolated by org_id in 9999.

CREATE TYPE "public"."cross_connect_type" AS ENUM('cloud', 'carrier', 'customer', 'internal', 'ix');--> statement-breakpoint

ALTER TABLE "cross_connects"
  ADD COLUMN "connection_type"     "cross_connect_type" DEFAULT 'carrier' NOT NULL,
  ADD COLUMN "z_side_provider"     text,
  ADD COLUMN "install_fee_minor"   bigint,
  ADD COLUMN "monthly_charge_minor" bigint,
  ADD COLUMN "notes"               text,
  ADD COLUMN "requested_by"        text,
  ADD COLUMN "decommissioned_at"   timestamp;--> statement-breakpoint

ALTER TABLE "cross_connects"
  ADD CONSTRAINT "cross_connects_requested_by_users_id_fk"
  FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

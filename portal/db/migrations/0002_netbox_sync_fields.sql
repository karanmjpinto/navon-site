-- Phase 1 NetBox federation: add external-sync tracking columns to the four
-- tables that map to NetBox objects (sites, cabinets, devices, cross_connects).
--
-- external_id holds the namespaced external key: "netbox:<nb_id>" or null.
-- The unique index per (org_id, external_id) is the upsert target.
-- archived_at supports soft-delete when a record disappears from NetBox.

CREATE TYPE "public"."external_source" AS ENUM('netbox', 'opendcim', 'manual');--> statement-breakpoint

ALTER TABLE "sites"
  ADD COLUMN "external_id"     text,
  ADD COLUMN "external_source" "external_source",
  ADD COLUMN "last_synced_at"  timestamp;--> statement-breakpoint

ALTER TABLE "cabinets"
  ADD COLUMN "external_id"     text,
  ADD COLUMN "external_source" "external_source",
  ADD COLUMN "last_synced_at"  timestamp,
  ADD COLUMN "archived_at"     timestamp;--> statement-breakpoint

ALTER TABLE "devices"
  ADD COLUMN "external_id"     text,
  ADD COLUMN "external_source" "external_source",
  ADD COLUMN "last_synced_at"  timestamp,
  ADD COLUMN "archived_at"     timestamp;--> statement-breakpoint

ALTER TABLE "cross_connects"
  ADD COLUMN "external_id"     text,
  ADD COLUMN "external_source" "external_source",
  ADD COLUMN "last_synced_at"  timestamp;--> statement-breakpoint

-- Partial unique indexes: only constrain non-null external_id values
-- so manually-created rows (null external_id) are never conflicted.
CREATE UNIQUE INDEX "sites_external_id_idx"
  ON "sites" ("org_id", "external_id")
  WHERE "external_id" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "cabinets_external_id_idx"
  ON "cabinets" ("org_id", "external_id")
  WHERE "external_id" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "devices_external_id_idx"
  ON "devices" ("org_id", "external_id")
  WHERE "external_id" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "cross_connects_external_id_idx"
  ON "cross_connects" ("org_id", "external_id")
  WHERE "external_id" IS NOT NULL;

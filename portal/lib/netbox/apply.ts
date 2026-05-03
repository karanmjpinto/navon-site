/**
 * Shared NetBox→Navon apply functions.
 *
 * Both the batch sync worker (workers/netbox-sync.ts) and the real-time
 * webhook handler (app/api/integrations/netbox/webhook/route.ts) call these
 * to upsert or archive individual records. Keeping them here means the two
 * paths are always consistent.
 */

import { eq, and, inArray, isNotNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { sites, cabinets, devices, crossConnects } from "@/db/schema";
import { withOrgContext } from "@/lib/tenant";
import {
  mapSite,
  mapRack,
  mapDevice,
  mapCircuit,
  externalId as mkExternalId,
} from "@/lib/netbox/mapper";
import type {
  NetBoxSite,
  NetBoxRack,
  NetBoxDevice,
  NetBoxCircuit,
} from "@/lib/netbox/types";

// ── Tx type alias ─────────────────────────────────────────────────
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ── Individual record upserts ─────────────────────────────────────

export async function applySite(
  tx: Tx,
  nb: NetBoxSite,
  orgId: string,
): Promise<void> {
  const row = mapSite(nb, orgId);
  await tx
    .insert(sites)
    .values(row)
    .onConflictDoUpdate({
      target: [sites.orgId, sites.externalId],
      set: {
        name: row.name,
        code: row.code,
        address: row.address,
        lastSyncedAt: row.lastSyncedAt,
      },
    });
}

export async function applyRack(
  tx: Tx,
  nb: NetBoxRack,
  orgId: string,
  siteId: string,
): Promise<void> {
  const row = mapRack(nb, orgId, siteId);
  await tx
    .insert(cabinets)
    .values(row)
    .onConflictDoUpdate({
      target: [cabinets.orgId, cabinets.externalId],
      set: {
        label: row.label,
        rackUnits: row.rackUnits,
        status: row.status,
        lastSyncedAt: row.lastSyncedAt,
        archivedAt: null,
      },
    });
}

export async function applyDevice(
  tx: Tx,
  nb: NetBoxDevice,
  orgId: string,
  cabinetId: string,
): Promise<void> {
  const row = mapDevice(nb, orgId, cabinetId);
  await tx
    .insert(devices)
    .values(row)
    .onConflictDoUpdate({
      target: [devices.orgId, devices.externalId],
      set: {
        label: row.label,
        vendor: row.vendor,
        model: row.model,
        serial: row.serial,
        role: row.role,
        rackUStart: row.rackUStart,
        rackUSize: row.rackUSize,
        cabinetId: row.cabinetId,
        lastSyncedAt: row.lastSyncedAt,
        archivedAt: null,
      },
    });
}

export async function applyCircuit(
  tx: Tx,
  nb: NetBoxCircuit,
  orgId: string,
  fromCabinetId: string,
): Promise<void> {
  const row = mapCircuit(nb, orgId, fromCabinetId);
  await tx
    .insert(crossConnects)
    .values(row)
    .onConflictDoUpdate({
      target: [crossConnects.orgId, crossConnects.externalId],
      set: {
        toLabel: row.toLabel,
        speedGbps: row.speedGbps,
        status: row.status,
        lastSyncedAt: row.lastSyncedAt,
      },
    });
}

// ── Soft-delete (used by webhook deleted events) ──────────────────

export async function archiveSite(orgId: string, nbId: number): Promise<void> {
  await withOrgContext(orgId, async (tx) => {
    await tx
      .update(sites)
      .set({ lastSyncedAt: new Date() })
      .where(
        and(
          eq(sites.orgId, orgId),
          eq(sites.externalId, mkExternalId(nbId)),
        ),
      );
  });
}

export async function archiveRack(orgId: string, nbId: number): Promise<void> {
  await withOrgContext(orgId, async (tx) => {
    await tx
      .update(cabinets)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(cabinets.orgId, orgId),
          eq(cabinets.externalId, mkExternalId(nbId)),
        ),
      );
  });
}

export async function archiveDevice(orgId: string, nbId: number): Promise<void> {
  await withOrgContext(orgId, async (tx) => {
    await tx
      .update(devices)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(devices.orgId, orgId),
          eq(devices.externalId, mkExternalId(nbId)),
        ),
      );
  });
}

export async function archiveCircuit(orgId: string, nbId: number): Promise<void> {
  await withOrgContext(orgId, async (tx) => {
    await tx
      .update(crossConnects)
      .set({ lastSyncedAt: new Date() })
      .where(
        and(
          eq(crossConnects.orgId, orgId),
          eq(crossConnects.externalId, mkExternalId(nbId)),
        ),
      );
  });
}

// ── Batch soft-delete helpers (used by sync worker) ───────────────

export async function archiveRacksNotIn(
  tx: Tx,
  orgId: string,
  seenExtIds: string[],
): Promise<number> {
  if (seenExtIds.length === 0) return 0;
  const rows = await tx
    .update(cabinets)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(cabinets.orgId, orgId),
        eq(cabinets.externalSource, "netbox"),
        isNotNull(cabinets.externalId),
        notInArray(cabinets.externalId, seenExtIds),
      ),
    )
    .returning({ id: cabinets.id });
  return rows.length;
}

export async function archiveDevicesNotIn(
  tx: Tx,
  orgId: string,
  seenExtIds: string[],
): Promise<void> {
  if (seenExtIds.length === 0) return;
  await tx
    .update(devices)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(devices.orgId, orgId),
        eq(devices.externalSource, "netbox"),
        isNotNull(devices.externalId),
        notInArray(devices.externalId, seenExtIds),
      ),
    );
}

// ── Site-ID lookup (shared between sync and webhook) ──────────────

export async function resolveSiteId(
  tx: Tx,
  orgId: string,
  nbSiteId: number,
): Promise<string | null> {
  const rows = await tx
    .select({ id: sites.id })
    .from(sites)
    .where(
      and(
        eq(sites.orgId, orgId),
        eq(sites.externalId, mkExternalId(nbSiteId)),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function resolveFirstCabinetId(
  tx: Tx,
  orgId: string,
): Promise<string | null> {
  const rows = await tx
    .select({ id: cabinets.id })
    .from(cabinets)
    .where(
      and(
        eq(cabinets.orgId, orgId),
        isNotNull(cabinets.externalId),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * NetBox → Navon sync worker.
 *
 * Run directly:
 *   pnpm tsx portal/workers/netbox-sync.ts
 *
 * Or call runNetBoxSync() programmatically (admin trigger / cron).
 *
 * Strategy per tenant:
 *   1. Fetch all NetBox tenants whose slug matches a Navon org.
 *   2. For each matched org, sync sites → cabinets → devices → circuits.
 *   3. Upsert by (orgId, externalId). If a record existed in a previous sync
 *      but is absent from the current NetBox response, soft-delete it
 *      (set archivedAt = now) instead of hard-deleting.
 *   4. Write an audit log entry per run with counts.
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orgs, sites, cabinets, devices, vlans, prefixes } from "@/db/schema";
import { withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { NetBoxClient } from "@/lib/netbox/client";
import { externalId } from "@/lib/netbox/mapper";
import {
  applySite,
  applyRack,
  applyDevice,
  applyCircuit,
  applyVlan,
  applyPrefix,
  applyIpAddress,
  archiveRacksNotIn,
  archiveDevicesNotIn,
} from "@/lib/netbox/apply";
import type {
  NetBoxTenant, NetBoxSite, NetBoxRack, NetBoxDevice, NetBoxCircuit,
  NetBoxVlan, NetBoxPrefix, NetBoxIpAddress,
} from "@/lib/netbox/types";

export interface SyncCounts {
  fetched: number;
  upserted: number;
  archived: number;
  skipped: number;
  errored: number;
}

export interface OrgSyncResult {
  orgSlug: string;
  orgId: string;
  sites: SyncCounts;
  cabinets: SyncCounts;
  devices: SyncCounts;
  circuits: SyncCounts;
  vlans: SyncCounts;
  prefixes: SyncCounts;
  ipAddresses: SyncCounts;
  durationMs: number;
  error?: string;
}

function zeroCounts(): SyncCounts {
  return { fetched: 0, upserted: 0, archived: 0, skipped: 0, errored: 0 };
}

// ── Per-org sync ──────────────────────────────────────────────────

async function syncOrg(
  client: NetBoxClient,
  org: typeof orgs.$inferSelect,
  nbTenant: NetBoxTenant,
): Promise<OrgSyncResult> {
  const t0 = Date.now();
  const result: OrgSyncResult = {
    orgSlug: org.slug,
    orgId: org.id,
    sites: zeroCounts(),
    cabinets: zeroCounts(),
    devices: zeroCounts(),
    circuits: zeroCounts(),
    vlans: zeroCounts(),
    prefixes: zeroCounts(),
    ipAddresses: zeroCounts(),
    durationMs: 0,
  };

  try {
    // ── Sites ────────────────────────────────────────────────────
    const nbSites = await client.fetchAll<NetBoxSite>("dcim/sites/", {
      tenant_id: String(nbTenant.id),
    });
    result.sites.fetched = nbSites.length;

    const siteIdMap = new Map<number, string>();

    await withOrgContext(org.id, async (tx) => {
      for (const nb of nbSites) {
        try {
          await applySite(tx, nb, org.id);
          result.sites.upserted++;
        } catch (err) {
          console.error(`[netbox-sync] site ${nb.id} error:`, err);
          result.sites.errored++;
        }
      }

      const seenExtIds = nbSites.map((s) => externalId(s.id));
      if (seenExtIds.length > 0) {
        const rows = await tx
          .select({ id: sites.id, externalId: sites.externalId })
          .from(sites)
          .where(and(eq(sites.orgId, org.id), inArray(sites.externalId, seenExtIds)));
        for (const r of rows) {
          const nbId = parseInt(r.externalId!.replace("netbox:", ""), 10);
          siteIdMap.set(nbId, r.id);
        }
      }
    });

    // ── Racks ────────────────────────────────────────────────────
    const nbRacks = await client.fetchAll<NetBoxRack>("dcim/racks/", {
      tenant_id: String(nbTenant.id),
    });
    result.cabinets.fetched = nbRacks.length;

    const rackIdMap = new Map<number, string>();

    await withOrgContext(org.id, async (tx) => {
      for (const nb of nbRacks) {
        const siteId = siteIdMap.get(nb.site.id);
        if (!siteId) {
          console.warn(`[netbox-sync] rack ${nb.id}: site ${nb.site.id} not in siteIdMap — skipping`);
          result.cabinets.skipped++;
          continue;
        }
        try {
          await applyRack(tx, nb, org.id, siteId);
          result.cabinets.upserted++;
        } catch (err) {
          console.error(`[netbox-sync] rack ${nb.id} error:`, err);
          result.cabinets.errored++;
        }
      }

      const seenExtIds = nbRacks.map((r) => externalId(r.id));
      if (seenExtIds.length > 0) {
        const rows = await tx
          .select({ id: cabinets.id, externalId: cabinets.externalId })
          .from(cabinets)
          .where(and(eq(cabinets.orgId, org.id), inArray(cabinets.externalId, seenExtIds)));
        for (const r of rows) {
          const nbId = parseInt(r.externalId!.replace("netbox:", ""), 10);
          rackIdMap.set(nbId, r.id);
        }

        result.cabinets.archived = await archiveRacksNotIn(tx, org.id, seenExtIds);
      }
    });

    // ── Devices ──────────────────────────────────────────────────
    const nbDevices = await client.fetchAll<NetBoxDevice>("dcim/devices/", {
      tenant_id: String(nbTenant.id),
    });
    result.devices.fetched = nbDevices.length;

    const seenDeviceExtIds: string[] = [];

    await withOrgContext(org.id, async (tx) => {
      for (const nb of nbDevices) {
        const cabinetId = nb.rack ? rackIdMap.get(nb.rack.id) : undefined;
        if (!cabinetId) {
          result.devices.skipped++;
          continue;
        }
        try {
          await applyDevice(tx, nb, org.id, cabinetId);
          seenDeviceExtIds.push(externalId(nb.id));
          result.devices.upserted++;
        } catch (err) {
          console.error(`[netbox-sync] device ${nb.id} error:`, err);
          result.devices.errored++;
        }
      }

      await archiveDevicesNotIn(tx, org.id, seenDeviceExtIds);
    });

    // ── Circuits ─────────────────────────────────────────────────
    const nbCircuits = await client.fetchAll<NetBoxCircuit>("circuits/circuits/", {
      tenant_id: String(nbTenant.id),
    });
    result.circuits.fetched = nbCircuits.length;

    const firstCabinetId = rackIdMap.values().next().value as string | undefined;

    await withOrgContext(org.id, async (tx) => {
      for (const nb of nbCircuits) {
        if (!firstCabinetId) {
          result.circuits.skipped++;
          continue;
        }
        try {
          await applyCircuit(tx, nb, org.id, firstCabinetId);
          result.circuits.upserted++;
        } catch (err) {
          console.error(`[netbox-sync] circuit ${nb.id} error:`, err);
          result.circuits.errored++;
        }
      }
    });
    // ── VLANs ────────────────────────────────────────────────────
    const nbVlans = await client.fetchAll<NetBoxVlan>("ipam/vlans/", {
      tenant_id: String(nbTenant.id),
    });
    result.vlans.fetched = nbVlans.length;

    const vlanIdMap = new Map<number, string>(); // nb vlan id → Navon vlan uuid

    await withOrgContext(org.id, async (tx) => {
      for (const nb of nbVlans) {
        const siteId = nb.site ? (siteIdMap.get(nb.site.id) ?? null) : null;
        try {
          await applyVlan(tx, nb, org.id, siteId);
          result.vlans.upserted++;
        } catch (err) {
          console.error(`[netbox-sync] vlan ${nb.id} error:`, err);
          result.vlans.errored++;
        }
      }
      // Reload vlan IDs for prefix FK
      const seenVlanExtIds = nbVlans.map((v) => externalId(v.id));
      if (seenVlanExtIds.length > 0) {
        const rows = await tx
          .select({ id: vlans.id, externalId: vlans.externalId })
          .from(vlans)
          .where(and(eq(vlans.orgId, org.id), inArray(vlans.externalId, seenVlanExtIds)));
        for (const r of rows) {
          const nbId = parseInt(r.externalId!.replace("netbox:", ""), 10);
          vlanIdMap.set(nbId, r.id);
        }
      }
    });

    // ── Prefixes ─────────────────────────────────────────────────
    const nbPrefixes = await client.fetchAll<NetBoxPrefix>("ipam/prefixes/", {
      tenant_id: String(nbTenant.id),
    });
    result.prefixes.fetched = nbPrefixes.length;

    const prefixIdMap = new Map<string, string>(); // nb prefix string → Navon prefix uuid

    await withOrgContext(org.id, async (tx) => {
      for (const nb of nbPrefixes) {
        const siteId = nb.site ? (siteIdMap.get(nb.site.id) ?? null) : null;
        const vlanId = nb.vlan ? (vlanIdMap.get(nb.vlan.id) ?? null) : null;
        try {
          await applyPrefix(tx, nb, org.id, siteId, vlanId);
          result.prefixes.upserted++;
        } catch (err) {
          console.error(`[netbox-sync] prefix ${nb.id} error:`, err);
          result.prefixes.errored++;
        }
      }
      // Reload prefix rows for IP address FK
      const seenPrefixExtIds = nbPrefixes.map((p) => externalId(p.id));
      if (seenPrefixExtIds.length > 0) {
        const rows = await tx
          .select({ id: prefixes.id, externalId: prefixes.externalId })
          .from(prefixes)
          .where(and(eq(prefixes.orgId, org.id), inArray(prefixes.externalId, seenPrefixExtIds)));
        for (const r of rows) {
          prefixIdMap.set(r.externalId!, r.id);
        }
      }
    });

    // ── IP Addresses ─────────────────────────────────────────────
    const nbIps = await client.fetchAll<NetBoxIpAddress>("ipam/ip-addresses/", {
      tenant_id: String(nbTenant.id),
    });
    result.ipAddresses.fetched = nbIps.length;

    await withOrgContext(org.id, async (tx) => {
      for (const nb of nbIps) {
        // Try to find the containing prefix by matching the first synced prefix
        const prefixExtId = prefixIdMap.keys().next().value ?? null;
        const prefixId = prefixExtId ? (prefixIdMap.get(prefixExtId) ?? null) : null;
        // Resolve device from assigned_object if present
        const nbDeviceId = nb.assigned_object?.device?.id;
        const deviceExtId = nbDeviceId ? externalId(nbDeviceId) : null;
        let deviceId: string | null = null;
        if (deviceExtId) {
          const rows = await tx
            .select({ id: devices.id })
            .from(devices)
            .where(and(eq(devices.orgId, org.id), eq(devices.externalId, deviceExtId)))
            .limit(1);
          deviceId = rows[0]?.id ?? null;
        }
        try {
          await applyIpAddress(tx, nb, org.id, prefixId, deviceId);
          result.ipAddresses.upserted++;
        } catch (err) {
          console.error(`[netbox-sync] ip ${nb.id} error:`, err);
          result.ipAddresses.errored++;
        }
      }
    });

  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    console.error(`[netbox-sync] org ${org.slug} failed:`, err);
  }

  result.durationMs = Date.now() - t0;
  return result;
}

// ── Public API ────────────────────────────────────────────────────

export async function runNetBoxSync(): Promise<OrgSyncResult[]> {
  const client = NetBoxClient.fromEnv();

  const nbTenants = await client.fetchAll<NetBoxTenant>("tenancy/tenants/");
  const navonOrgs = await db.select().from(orgs);

  const pairs: Array<{ org: typeof orgs.$inferSelect; tenant: NetBoxTenant }> = [];
  for (const tenant of nbTenants) {
    const org = navonOrgs.find((o) => o.slug === tenant.slug);
    if (!org) {
      console.warn(`[netbox-sync] tenant "${tenant.slug}" has no matching Navon org — skipping`);
      continue;
    }
    pairs.push({ org, tenant });
  }

  if (pairs.length === 0) {
    console.warn("[netbox-sync] no tenant/org slug matches found — check slug alignment");
  }

  const results: OrgSyncResult[] = [];
  for (const { org, tenant } of pairs) {
    console.log(`[netbox-sync] syncing org "${org.slug}" ↔ tenant "${tenant.slug}"…`);
    const r = await syncOrg(client, org, tenant);
    results.push(r);
    console.log(
      `[netbox-sync] ${org.slug} done in ${r.durationMs}ms — ` +
      `sites ${r.sites.upserted}↑ ${r.sites.errored}✗ | ` +
      `racks ${r.cabinets.upserted}↑ ${r.cabinets.errored}✗ | ` +
      `devices ${r.devices.upserted}↑ ${r.devices.skipped}⊘ ${r.devices.errored}✗ | ` +
      `circuits ${r.circuits.upserted}↑ ${r.circuits.errored}✗ | ` +
      `vlans ${r.vlans.upserted}↑ | prefixes ${r.prefixes.upserted}↑ | ips ${r.ipAddresses.upserted}↑`,
    );
  }

  const totalUpserted = results.reduce(
    (n, r) =>
      n + r.sites.upserted + r.cabinets.upserted + r.devices.upserted +
      r.circuits.upserted + r.vlans.upserted + r.prefixes.upserted + r.ipAddresses.upserted,
    0,
  );
  const totalErrored = results.reduce(
    (n, r) =>
      n + r.sites.errored + r.cabinets.errored + r.devices.errored +
      r.circuits.errored + r.vlans.errored + r.prefixes.errored + r.ipAddresses.errored,
    0,
  );

  await recordAudit({
    action: "netbox.sync",
    targetType: "integration",
    metadata: {
      source: "netbox-sync",
      orgs: results.map((r) => r.orgSlug),
      totalUpserted,
      totalErrored,
      results,
    },
  });

  return results;
}

// ── CLI entry point ────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  runNetBoxSync()
    .then((results) => {
      const ok = results.every((r) => !r.error);
      process.exit(ok ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

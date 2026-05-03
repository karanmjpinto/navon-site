"use server";

import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { ipAddresses, prefixes, vlans, devices, sites } from "@/db/schema";
import { requireSession } from "@/lib/tenant";

export async function getNetworkData() {
  const { orgId } = await requireSession();

  const [ips, pfxs, vlanRows] = await Promise.all([
    db
      .select({
        id: ipAddresses.id,
        address: ipAddresses.address,
        status: ipAddresses.status,
        dnsName: ipAddresses.dnsName,
        description: ipAddresses.description,
        deviceLabel: devices.label,
        lastSyncedAt: ipAddresses.lastSyncedAt,
      })
      .from(ipAddresses)
      .leftJoin(devices, eq(ipAddresses.deviceId, devices.id))
      .where(eq(ipAddresses.orgId, orgId))
      .orderBy(ipAddresses.address),

    db
      .select({
        id: prefixes.id,
        prefix: prefixes.prefix,
        status: prefixes.status,
        role: prefixes.role,
        description: prefixes.description,
        siteName: sites.name,
        lastSyncedAt: prefixes.lastSyncedAt,
      })
      .from(prefixes)
      .leftJoin(sites, eq(prefixes.siteId, sites.id))
      .where(eq(prefixes.orgId, orgId))
      .orderBy(prefixes.prefix),

    db
      .select({
        id: vlans.id,
        vid: vlans.vid,
        name: vlans.name,
        status: vlans.status,
        description: vlans.description,
        siteName: sites.name,
        lastSyncedAt: vlans.lastSyncedAt,
      })
      .from(vlans)
      .leftJoin(sites, eq(vlans.siteId, sites.id))
      .where(eq(vlans.orgId, orgId))
      .orderBy(vlans.vid),
  ]);

  return { ipAddresses: ips, prefixes: pfxs, vlans: vlanRows };
}

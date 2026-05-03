// Pure mapping functions: NetBox API objects → Navon schema insert shapes.
// No DB access here — unit-testable without any database or server context.

import type {
  NetBoxSite,
  NetBoxRack,
  NetBoxDevice,
  NetBoxCircuit,
  NetBoxVlan,
  NetBoxPrefix,
  NetBoxIpAddress,
} from "./types.js";
import type { sites, cabinets, devices, crossConnects, vlans, prefixes, ipAddresses } from "@/db/schema";

type SiteInsert = typeof sites.$inferInsert;
type CabinetInsert = typeof cabinets.$inferInsert;
type DeviceInsert = typeof devices.$inferInsert;
type CrossConnectInsert = typeof crossConnects.$inferInsert;
type VlanInsert = typeof vlans.$inferInsert;
type PrefixInsert = typeof prefixes.$inferInsert;
type IpAddressInsert = typeof ipAddresses.$inferInsert;

// Navon device role enum values
const ROLE_MAP: Record<string, DeviceInsert["role"]> = {
  server: "compute",
  compute: "compute",
  storage: "storage",
  "top-of-rack-switch": "network",
  switch: "network",
  router: "network",
  network: "network",
  pdu: "other",
  firewall: "network",
  other: "other",
};

function mapDeviceRole(nbSlug: string): DeviceInsert["role"] {
  return ROLE_MAP[nbSlug.toLowerCase()] ?? "other";
}

// NetBox circuit status → Navon cross_connect status
const CIRCUIT_STATUS_MAP: Record<string, CrossConnectInsert["status"]> = {
  active: "provisioned",
  planned: "pending",
  provisioning: "pending",
  offline: "decommissioned",
  deprovisioning: "decommissioned",
  decommissioned: "decommissioned",
};

export function externalId(nbId: number): string {
  return `netbox:${nbId}`;
}

export function mapSite(nb: NetBoxSite, orgId: string): SiteInsert {
  return {
    orgId,
    name: nb.name,
    code: nb.slug.toUpperCase().slice(0, 20),
    address: nb.physical_address ?? undefined,
    country: "KE",
    externalId: externalId(nb.id),
    externalSource: "netbox",
    lastSyncedAt: new Date(),
  };
}

export function mapRack(
  nb: NetBoxRack,
  orgId: string,
  siteId: string,
): CabinetInsert {
  return {
    orgId,
    siteId,
    label: nb.name,
    rackUnits: nb.u_height,
    // NetBox doesn't model power cap at the rack level in the base schema;
    // default to 6 kW. Operators can override manually in Navon.
    powerCapKw: 6,
    status: nb.status.value === "active" ? "active" : "decommissioned",
    externalId: externalId(nb.id),
    externalSource: "netbox",
    lastSyncedAt: new Date(),
  };
}

export function mapDevice(
  nb: NetBoxDevice,
  orgId: string,
  cabinetId: string,
): DeviceInsert {
  return {
    orgId,
    cabinetId,
    label: nb.name ?? `device-${nb.id}`,
    vendor: nb.device_type.manufacturer.name ?? null,
    model: nb.device_type.model ?? null,
    serial: nb.serial || null,
    role: mapDeviceRole(nb.role.slug),
    rackUStart: nb.position ?? null,
    rackUSize: nb.device_type.u_height,
    externalId: externalId(nb.id),
    externalSource: "netbox",
    lastSyncedAt: new Date(),
  };
}

export function mapCircuit(
  nb: NetBoxCircuit,
  orgId: string,
  cabinetId: string,
): CrossConnectInsert {
  return {
    orgId,
    fromCabinetId: cabinetId,
    toLabel: `${nb.provider.name ?? "Provider"} · ${nb.cid}`,
    speedGbps: nb.commit_rate ? nb.commit_rate / 1000 : 1,
    media: "fiber_sm",
    status: CIRCUIT_STATUS_MAP[nb.status.value] ?? "pending",
    externalId: externalId(nb.id),
    externalSource: "netbox",
    lastSyncedAt: new Date(),
  };
}

// ── IPAM mappers ──────────────────────────────────────────────────

export function mapVlan(
  nb: NetBoxVlan,
  orgId: string,
  siteId: string | null,
): VlanInsert {
  return {
    orgId,
    siteId: siteId ?? undefined,
    vid: nb.vid,
    name: nb.name,
    status: nb.status.value,
    description: nb.description || null,
    externalId: externalId(nb.id),
    externalSource: "netbox",
    lastSyncedAt: new Date(),
  };
}

export function mapPrefix(
  nb: NetBoxPrefix,
  orgId: string,
  siteId: string | null,
  vlanId: string | null,
): PrefixInsert {
  return {
    orgId,
    siteId: siteId ?? undefined,
    vlanId: vlanId ?? undefined,
    prefix: nb.prefix,
    status: nb.status.value,
    role: nb.role?.name ?? null,
    description: nb.description || null,
    isPool: nb.is_pool,
    externalId: externalId(nb.id),
    externalSource: "netbox",
    lastSyncedAt: new Date(),
  };
}

export function mapIpAddress(
  nb: NetBoxIpAddress,
  orgId: string,
  prefixId: string | null,
  deviceId: string | null,
): IpAddressInsert {
  return {
    orgId,
    prefixId: prefixId ?? undefined,
    deviceId: deviceId ?? undefined,
    address: nb.address,
    status: nb.status.value,
    dnsName: nb.dns_name || null,
    description: nb.description || null,
    externalId: externalId(nb.id),
    externalSource: "netbox",
    lastSyncedAt: new Date(),
  };
}

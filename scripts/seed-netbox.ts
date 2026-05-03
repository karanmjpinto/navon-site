#!/usr/bin/env tsx
/**
 * Seed NetBox with a minimal fixture that mirrors the Navon demo orgs.
 *
 * Tenant → Navon org mapping (join key: slug):
 *   NetBox tenant "University of Nairobi" (slug: uon)    → orgs.slug = "uon"
 *   NetBox tenant "Pesa Mobile Ltd"       (slug: pesa-mobile-ltd) → orgs.slug = "pesa-mobile-ltd"
 *
 * Fixture created:
 *   1 site  (Hells Gate DC, site code HG-01)
 *   2 racks (HG-A01, HG-A02)
 *   4 devices
 *     - uon-server-01  (compute, 1U, rack HG-A01 slot 1, tenant: uon)
 *     - uon-server-02  (compute, 1U, rack HG-A01 slot 2, tenant: uon)
 *     - hg-core-sw-01  (network, 1U, rack HG-A02 slot 1, tenant: uon)
 *     - hg-pdu-a01     (PDU, 1U, rack HG-A02 slot 44, tenant: uon)
 *   1 circuit provider (KENIC Bandwidth)
 *   2 circuits
 *     - KE-KENIC-001  (transit, tenant: uon)
 *     - KE-KENIC-002  (transit, tenant: pesa-mobile-ltd)
 *
 * Usage:
 *   NETBOX_URL=http://localhost:8000 NETBOX_TOKEN=navon-netbox-dev-00000000000000000000 \
 *     pnpm tsx scripts/seed-netbox.ts
 *
 * Idempotent: re-running skips objects that already exist (409 → name lookup).
 */

const BASE = process.env.NETBOX_URL ?? "http://localhost:8000";
const TOKEN = process.env.NETBOX_TOKEN ?? "navon-netbox-dev-00000000000000000000";

async function nb<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    headers: {
      Authorization: `Token ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NetBox ${method} /api/${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function getOrCreate<T extends { id: number }>(
  listPath: string,
  createPath: string,
  payload: Record<string, unknown>,
  lookupField = "slug",
): Promise<T> {
  try {
    return await nb<T>("POST", createPath, payload);
  } catch (err: unknown) {
    if (!(err instanceof Error && err.message.includes("400"))) throw err;
    // Already exists — fetch by slug or name
    const value = payload[lookupField] ?? payload["name"];
    const list = await nb<{ results: T[] }>("GET", `${listPath}?${lookupField}=${value}`);
    if (!list.results[0]) throw new Error(`getOrCreate: cannot find existing ${createPath} with ${lookupField}=${value}`);
    console.log(`  → exists (id ${list.results[0].id})`);
    return list.results[0];
  }
}

async function main() {
  console.log(`Seeding NetBox at ${BASE} …`);

  // ── Tenants ──────────────────────────────────────────────────────
  console.log("\n[tenants]");
  const tenantUon = await getOrCreate(
    "tenancy/tenants/", "tenancy/tenants/",
    { name: "University of Nairobi", slug: "uon" },
  );
  console.log(`  uon: id=${tenantUon.id}`);

  const tenantPesa = await getOrCreate(
    "tenancy/tenants/", "tenancy/tenants/",
    { name: "Pesa Mobile Ltd", slug: "pesa-mobile-ltd" },
  );
  console.log(`  pesa-mobile-ltd: id=${tenantPesa.id}`);

  // ── Manufacturer + device types ──────────────────────────────────
  console.log("\n[manufacturer]");
  const mfr = await getOrCreate(
    "dcim/manufacturers/", "dcim/manufacturers/",
    { name: "Generic", slug: "generic" },
  );

  const dtServer = await getOrCreate(
    "dcim/device-types/", "dcim/device-types/",
    { manufacturer: mfr.id, model: "1U Server", slug: "1u-server", u_height: 1 },
    "slug",
  );
  const dtSwitch = await getOrCreate(
    "dcim/device-types/", "dcim/device-types/",
    { manufacturer: mfr.id, model: "1U Switch", slug: "1u-switch", u_height: 1 },
    "slug",
  );
  const dtPdu = await getOrCreate(
    "dcim/device-types/", "dcim/device-types/",
    { manufacturer: mfr.id, model: "1U PDU", slug: "1u-pdu", u_height: 1 },
    "slug",
  );
  console.log(`  device types: server=${dtServer.id} switch=${dtSwitch.id} pdu=${dtPdu.id}`);

  // ── Device roles ─────────────────────────────────────────────────
  console.log("\n[device roles]");
  const roleServer = await getOrCreate(
    "dcim/device-roles/", "dcim/device-roles/",
    { name: "Server", slug: "server", color: "9e9e9e" },
  );
  const roleSwitch = await getOrCreate(
    "dcim/device-roles/", "dcim/device-roles/",
    { name: "Top-of-Rack Switch", slug: "top-of-rack-switch", color: "2196f3" },
  );
  const rolePdu = await getOrCreate(
    "dcim/device-roles/", "dcim/device-roles/",
    { name: "PDU", slug: "pdu", color: "ff9800" },
  );
  console.log(`  roles: server=${roleServer.id} switch=${roleSwitch.id} pdu=${rolePdu.id}`);

  // ── Site ─────────────────────────────────────────────────────────
  console.log("\n[site]");
  const site = await getOrCreate(
    "dcim/sites/", "dcim/sites/",
    {
      name: "Hells Gate DC",
      slug: "hells-gate-dc",
      status: "active",
      physical_address: "Hells Gate National Park, Naivasha, Kenya",
      tenant: tenantUon.id,
    },
  );
  console.log(`  site: id=${site.id}`);

  // ── Racks ────────────────────────────────────────────────────────
  console.log("\n[racks]");
  const rackA01 = await getOrCreate(
    "dcim/racks/", "dcim/racks/",
    {
      name: "HG-A01",
      site: site.id,
      tenant: tenantUon.id,
      status: "active",
      u_height: 47,
    },
    "name",
  );
  const rackA02 = await getOrCreate(
    "dcim/racks/", "dcim/racks/",
    {
      name: "HG-A02",
      site: site.id,
      tenant: tenantUon.id,
      status: "active",
      u_height: 47,
    },
    "name",
  );
  console.log(`  racks: A01=${rackA01.id} A02=${rackA02.id}`);

  // ── Devices ──────────────────────────────────────────────────────
  console.log("\n[devices]");
  const devices = [
    {
      name: "uon-server-01",
      device_type: dtServer.id,
      role: roleServer.id,
      site: site.id,
      rack: rackA01.id,
      position: 1,
      face: "front",
      tenant: tenantUon.id,
      status: "active",
    },
    {
      name: "uon-server-02",
      device_type: dtServer.id,
      role: roleServer.id,
      site: site.id,
      rack: rackA01.id,
      position: 2,
      face: "front",
      tenant: tenantUon.id,
      status: "active",
    },
    {
      name: "hg-core-sw-01",
      device_type: dtSwitch.id,
      role: roleSwitch.id,
      site: site.id,
      rack: rackA02.id,
      position: 1,
      face: "front",
      tenant: tenantUon.id,
      status: "active",
    },
    {
      name: "hg-pdu-a01",
      device_type: dtPdu.id,
      role: rolePdu.id,
      site: site.id,
      rack: rackA02.id,
      position: 44,
      face: "front",
      tenant: tenantUon.id,
      status: "active",
    },
  ];
  for (const d of devices) {
    const created = await getOrCreate("dcim/devices/", "dcim/devices/", d, "name");
    console.log(`  ${d.name}: id=${created.id}`);
  }

  // ── Circuit provider + type ──────────────────────────────────────
  console.log("\n[circuits]");
  const provider = await getOrCreate(
    "circuits/providers/", "circuits/providers/",
    { name: "KENIC Bandwidth", slug: "kenic-bandwidth" },
  );
  const circuitType = await getOrCreate(
    "circuits/circuit-types/", "circuits/circuit-types/",
    { name: "Internet Transit", slug: "internet-transit" },
  );

  const circuits = [
    { cid: "KE-KENIC-001", provider: provider.id, type: circuitType.id, tenant: tenantUon.id, status: "active", commit_rate: 10000 },
    { cid: "KE-KENIC-002", provider: provider.id, type: circuitType.id, tenant: tenantPesa.id, status: "active", commit_rate: 5000 },
  ];
  for (const c of circuits) {
    const created = await getOrCreate("circuits/circuits/", "circuits/circuits/", c, "cid");
    console.log(`  ${c.cid} (tenant ${c.tenant === tenantUon.id ? "uon" : "pesa"}): id=${created.id}`);
  }

  console.log("\n✓ Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

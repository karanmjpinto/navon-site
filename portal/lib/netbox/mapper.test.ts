import { describe, it, expect } from "vitest";
import { mapSite, mapRack, mapDevice, mapCircuit, externalId } from "./mapper";
import type { NetBoxSite, NetBoxRack, NetBoxDevice, NetBoxCircuit } from "./types";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const SITE_ID = "00000000-0000-0000-0000-000000000002";
const CABINET_ID = "00000000-0000-0000-0000-000000000003";

// ── Fixtures (representative NetBox API responses) ─────────────────

const nbSite: NetBoxSite = {
  id: 42,
  name: "Hells Gate DC",
  slug: "hells-gate-dc",
  status: { value: "active", label: "Active" },
  physical_address: "Naivasha, Kenya",
  tenant: { id: 1, slug: "uon" },
};

const nbRack: NetBoxRack = {
  id: 7,
  name: "HG-A01",
  site: { id: 42, slug: "hells-gate-dc" },
  tenant: { id: 1, slug: "uon" },
  status: { value: "active", label: "Active" },
  u_height: 47,
  facility_id: null,
};

const nbDevice: NetBoxDevice = {
  id: 99,
  name: "uon-server-01",
  device_type: {
    id: 3,
    model: "1U Server",
    slug: "1u-server",
    manufacturer: { id: 1, name: "Generic" },
    u_height: 1,
  },
  role: { id: 2, name: "Server", slug: "server" },
  tenant: { id: 1, slug: "uon" },
  site: { id: 42, slug: "hells-gate-dc" },
  rack: { id: 7, name: "HG-A01" },
  position: 1,
  serial: "SN-001",
  status: { value: "active", label: "Active" },
};

const nbCircuit: NetBoxCircuit = {
  id: 55,
  cid: "KE-KENIC-001",
  provider: { id: 10, name: "KENIC Bandwidth", slug: "kenic-bandwidth" },
  type: { id: 1, name: "Internet Transit", slug: "internet-transit" },
  tenant: { id: 1, slug: "uon" },
  status: { value: "active", label: "Active" },
  commit_rate: 10000,
  description: "",
};

// ── externalId ─────────────────────────────────────────────────────

describe("externalId", () => {
  it("prefixes with netbox:", () => {
    expect(externalId(42)).toBe("netbox:42");
    expect(externalId(1)).toBe("netbox:1");
  });
});

// ── mapSite ────────────────────────────────────────────────────────

describe("mapSite", () => {
  it("maps core fields correctly", () => {
    const row = mapSite(nbSite, ORG_ID);
    expect(row.orgId).toBe(ORG_ID);
    expect(row.name).toBe("Hells Gate DC");
    expect(row.address).toBe("Naivasha, Kenya");
    expect(row.externalId).toBe("netbox:42");
    expect(row.externalSource).toBe("netbox");
    expect(row.lastSyncedAt).toBeInstanceOf(Date);
  });

  it("truncates slug to 20 chars for code", () => {
    const longSlug: NetBoxSite = { ...nbSite, slug: "very-long-site-slug-that-exceeds-twenty" };
    const row = mapSite(longSlug, ORG_ID);
    expect(row.code.length).toBeLessThanOrEqual(20);
  });

  it("handles null address", () => {
    const row = mapSite({ ...nbSite, physical_address: null }, ORG_ID);
    expect(row.address).toBeUndefined();
  });
});

// ── mapRack ────────────────────────────────────────────────────────

describe("mapRack", () => {
  it("maps core fields correctly", () => {
    const row = mapRack(nbRack, ORG_ID, SITE_ID);
    expect(row.orgId).toBe(ORG_ID);
    expect(row.siteId).toBe(SITE_ID);
    expect(row.label).toBe("HG-A01");
    expect(row.rackUnits).toBe(47);
    expect(row.externalId).toBe("netbox:7");
    expect(row.externalSource).toBe("netbox");
  });

  it("maps active status correctly", () => {
    expect(mapRack(nbRack, ORG_ID, SITE_ID).status).toBe("active");
  });

  it("maps non-active status to decommissioned", () => {
    const offline = { ...nbRack, status: { value: "offline", label: "Offline" } };
    expect(mapRack(offline, ORG_ID, SITE_ID).status).toBe("decommissioned");
  });
});

// ── mapDevice ──────────────────────────────────────────────────────

describe("mapDevice", () => {
  it("maps core fields correctly", () => {
    const row = mapDevice(nbDevice, ORG_ID, CABINET_ID);
    expect(row.orgId).toBe(ORG_ID);
    expect(row.cabinetId).toBe(CABINET_ID);
    expect(row.label).toBe("uon-server-01");
    expect(row.vendor).toBe("Generic");
    expect(row.model).toBe("1U Server");
    expect(row.serial).toBe("SN-001");
    expect(row.rackUStart).toBe(1);
    expect(row.rackUSize).toBe(1);
    expect(row.externalId).toBe("netbox:99");
  });

  it("maps server role → compute", () => {
    expect(mapDevice(nbDevice, ORG_ID, CABINET_ID).role).toBe("compute");
  });

  it("maps switch role → network", () => {
    const sw = { ...nbDevice, role: { id: 3, name: "Switch", slug: "top-of-rack-switch" } };
    expect(mapDevice(sw, ORG_ID, CABINET_ID).role).toBe("network");
  });

  it("maps pdu role → other", () => {
    const pdu = { ...nbDevice, role: { id: 4, name: "PDU", slug: "pdu" } };
    expect(mapDevice(pdu, ORG_ID, CABINET_ID).role).toBe("other");
  });

  it("falls back to device-N label when name is null", () => {
    const unnamed = { ...nbDevice, name: null };
    expect(mapDevice(unnamed, ORG_ID, CABINET_ID).label).toBe("device-99");
  });

  it("stores null serial for empty string", () => {
    const noSerial = { ...nbDevice, serial: "" };
    expect(mapDevice(noSerial, ORG_ID, CABINET_ID).serial).toBeNull();
  });
});

// ── mapCircuit ────────────────────────────────────────────────────

describe("mapCircuit", () => {
  it("maps core fields correctly", () => {
    const row = mapCircuit(nbCircuit, ORG_ID, CABINET_ID);
    expect(row.orgId).toBe(ORG_ID);
    expect(row.fromCabinetId).toBe(CABINET_ID);
    expect(row.toLabel).toContain("KENIC Bandwidth");
    expect(row.toLabel).toContain("KE-KENIC-001");
    expect(row.speedGbps).toBe(10); // 10000 Mbps → 10 Gbps
    expect(row.externalId).toBe("netbox:55");
  });

  it("maps active status → provisioned", () => {
    expect(mapCircuit(nbCircuit, ORG_ID, CABINET_ID).status).toBe("provisioned");
  });

  it("maps planned status → pending", () => {
    const planned = { ...nbCircuit, status: { value: "planned", label: "Planned" } };
    expect(mapCircuit(planned, ORG_ID, CABINET_ID).status).toBe("pending");
  });

  it("maps offline status → decommissioned", () => {
    const offline = { ...nbCircuit, status: { value: "offline", label: "Offline" } };
    expect(mapCircuit(offline, ORG_ID, CABINET_ID).status).toBe("decommissioned");
  });

  it("defaults to 1 Gbps when commit_rate is null", () => {
    const noRate = { ...nbCircuit, commit_rate: null };
    expect(mapCircuit(noRate, ORG_ID, CABINET_ID).speedGbps).toBe(1);
  });
});

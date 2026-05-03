import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

// ── Mocks ─────────────────────────────────────────────────────────

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "org-uuid-1" }]),
        }),
      }),
    }),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    ),
  },
}));

vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/tenant", () => ({
  withOrgContext: vi.fn().mockImplementation(
    async (_orgId: string, fn: (tx: unknown) => Promise<unknown>) => fn({}),
  ),
}));
vi.mock("@/lib/netbox/apply", () => ({
  applySite: vi.fn().mockResolvedValue(undefined),
  applyRack: vi.fn().mockResolvedValue(undefined),
  applyDevice: vi.fn().mockResolvedValue(undefined),
  applyCircuit: vi.fn().mockResolvedValue(undefined),
  archiveSite: vi.fn().mockResolvedValue(undefined),
  archiveRack: vi.fn().mockResolvedValue(undefined),
  archiveDevice: vi.fn().mockResolvedValue(undefined),
  archiveCircuit: vi.fn().mockResolvedValue(undefined),
  resolveSiteId: vi.fn().mockResolvedValue("site-uuid-1"),
  resolveFirstCabinetId: vi.fn().mockResolvedValue("cabinet-uuid-1"),
}));

// ── Helpers ───────────────────────────────────────────────────────

const SECRET = "test-webhook-secret-abc123";

function sign(body: string, secret = SECRET): string {
  return "sha512=" + createHmac("sha512", secret).update(body, "utf8").digest("hex");
}

function makeRequest(payload: object, secret?: string): Request {
  const body = JSON.stringify(payload);
  return new Request("http://localhost/api/integrations/netbox/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hook-Signature": sign(body, secret ?? SECRET),
    },
    body,
  });
}

// Golden payloads
const SITE_CREATED = {
  event: "created",
  timestamp: "2026-05-03T01:00:00Z",
  model: "dcim.site",
  username: "netbox",
  request_id: "req-site-001",
  data: {
    id: 1,
    name: "Hells Gate DC",
    slug: "hells-gate-dc",
    status: { value: "active" },
    physical_address: "Naivasha, Kenya",
    tenant: { id: 1, slug: "uon" },
    custom_fields: {},
  },
};

const RACK_UPDATED = {
  event: "updated",
  timestamp: "2026-05-03T01:01:00Z",
  model: "dcim.rack",
  username: "netbox",
  request_id: "req-rack-001",
  data: {
    id: 10,
    name: "HG-A01",
    site: { id: 1, slug: "hells-gate-dc" },
    u_height: 47,
    status: { value: "active" },
    tenant: { id: 1, slug: "uon" },
    custom_fields: {},
  },
};

const DEVICE_DELETED = {
  event: "deleted",
  timestamp: "2026-05-03T01:02:00Z",
  model: "dcim.device",
  username: "netbox",
  request_id: "req-device-001",
  data: {
    id: 42,
    name: "uon-server-01",
    device_type: { id: 1, model: "PowerEdge R640" },
    role: { id: 1, slug: "server" },
    site: { id: 1, slug: "hells-gate-dc" },
    rack: { id: 10, name: "HG-A01" },
    position: 1,
    tenant: { id: 1, slug: "uon" },
    status: { value: "active" },
    serial: "SN001",
    custom_fields: {},
  },
};

const CIRCUIT_CREATED = {
  event: "created",
  timestamp: "2026-05-03T01:03:00Z",
  model: "circuits.circuit",
  username: "netbox",
  request_id: "req-circuit-001",
  data: {
    id: 5,
    cid: "KE-KENIC-001",
    provider: { id: 1, slug: "kenic-bandwidth" },
    type: { id: 1, slug: "internet-transit" },
    status: { value: "active" },
    commit_rate: 10000,
    tenant: { id: 1, slug: "uon" },
    custom_fields: {},
  },
};

const TENANT_CREATED = {
  event: "created",
  timestamp: "2026-05-03T01:04:00Z",
  model: "tenancy.tenant",
  username: "netbox",
  request_id: "req-tenant-001",
  data: {
    id: 3,
    name: "New Corp",
    slug: "new-corp",
    custom_fields: {},
  },
};

// ── Tests ─────────────────────────────────────────────────────────

describe("POST /api/integrations/netbox/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NETBOX_WEBHOOK_SECRET = SECRET;
  });

  it("rejects request with bad signature → 401", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(SITE_CREATED, "wrong-secret");
    const res = await POST(req as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("signature");
  });

  it("accepts and processes dcim.site created", async () => {
    const { POST } = await import("./route");
    const { applySite } = await import("@/lib/netbox/apply");
    const req = makeRequest(SITE_CREATED);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(applySite).toHaveBeenCalledOnce();
  });

  it("accepts and processes dcim.rack updated", async () => {
    const { POST } = await import("./route");
    const { applyRack } = await import("@/lib/netbox/apply");
    const req = makeRequest(RACK_UPDATED);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(applyRack).toHaveBeenCalledOnce();
  });

  it("archives device on dcim.device deleted", async () => {
    const { POST } = await import("./route");
    const { archiveDevice } = await import("@/lib/netbox/apply");
    const req = makeRequest(DEVICE_DELETED);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(archiveDevice).toHaveBeenCalledWith("org-uuid-1", 42);
  });

  it("accepts circuits.circuit created", async () => {
    const { POST } = await import("./route");
    const { applyCircuit } = await import("@/lib/netbox/apply");
    const req = makeRequest(CIRCUIT_CREATED);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(applyCircuit).toHaveBeenCalledOnce();
  });

  it("handles tenancy.tenant event without mutating orgs", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(TENANT_CREATED);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 200 ok=true duplicate=true for idempotent replay", async () => {
    const { POST } = await import("./route");
    const payload = { ...SITE_CREATED, request_id: "req-idempotent-unique-1" };
    const req1 = makeRequest(payload);
    const req2 = makeRequest(payload);
    await POST(req1 as never);
    const res2 = await POST(req2 as never);
    expect(res2.status).toBe(200);
    const body = await res2.json();
    expect(body.duplicate).toBe(true);
  });

  it("returns 500 when NETBOX_WEBHOOK_SECRET is not set", async () => {
    delete process.env.NETBOX_WEBHOOK_SECRET;
    const { POST } = await import("./route");
    const req = makeRequest(SITE_CREATED);
    const res = await POST(req as never);
    expect(res.status).toBe(500);
  });
});

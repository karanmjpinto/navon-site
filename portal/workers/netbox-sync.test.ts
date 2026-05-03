import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock heavy dependencies before importing the worker ────────────

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/netbox/client", () => ({
  NetBoxClient: {
    fromEnv: vi.fn(),
  },
  NetBoxError: class NetBoxError extends Error {},
}));

vi.mock("@/lib/tenant", () => ({
  withOrgContext: vi.fn().mockImplementation(
    async (_orgId: string, fn: (tx: unknown) => Promise<unknown>) => fn({}),
  ),
}));

// After mocks are registered, import the module under test
import { runNetBoxSync } from "./netbox-sync";
import { db } from "@/db";
import { NetBoxClient } from "@/lib/netbox/client";

// ── Helpers ────────────────────────────────────────────────────────

function makeClientMock(overrides: Partial<{ fetchAll: ReturnType<typeof vi.fn> }> = {}) {
  return {
    fetchAll: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    ...overrides,
  };
}

const ORG = { id: "org-uuid-1", slug: "uon", name: "University of Nairobi", createdAt: new Date() };

// ── Tests ──────────────────────────────────────────────────────────

describe("runNetBoxSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NETBOX_URL = "http://netbox.local";
    process.env.NETBOX_TOKEN = "test-token";
  });

  it("returns empty array when no tenant/org slugs match", async () => {
    const client = makeClientMock({
      fetchAll: vi.fn()
        .mockResolvedValueOnce([{ id: 1, name: "Unknown Corp", slug: "unknown" }]) // tenants
    });
    vi.mocked(NetBoxClient.fromEnv).mockReturnValue(client as never);

    // db.select chain: orgs query
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([ORG]),
    });
    vi.mocked(db).select = selectMock;

    const results = await runNetBoxSync();
    expect(results).toHaveLength(0);
  });

  it("returns one result when tenant slug matches org slug", async () => {
    const client = makeClientMock({
      fetchAll: vi.fn()
        .mockResolvedValueOnce([{ id: 1, name: "University of Nairobi", slug: "uon" }]) // tenants
        .mockResolvedValueOnce([]) // sites
        .mockResolvedValueOnce([]) // racks
        .mockResolvedValueOnce([]) // devices
        .mockResolvedValueOnce([]), // circuits
    });
    vi.mocked(NetBoxClient.fromEnv).mockReturnValue(client as never);

    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([ORG]),
    });
    vi.mocked(db).select = selectMock;

    // withOrgContext calls db.transaction
    vi.mocked(db).transaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }) }),
        execute: vi.fn().mockResolvedValue(undefined),
      };
      return fn(tx);
    });

    const results = await runNetBoxSync();
    expect(results).toHaveLength(1);
    expect(results[0].orgSlug).toBe("uon");
    expect(results[0].error).toBeUndefined();
  });

  it("captures per-org errors without crashing the whole run", async () => {
    const client = makeClientMock({
      fetchAll: vi.fn()
        .mockResolvedValueOnce([{ id: 1, name: "University of Nairobi", slug: "uon" }]) // tenants
        .mockRejectedValueOnce(new Error("NetBox unreachable")), // sites fetch throws
    });
    vi.mocked(NetBoxClient.fromEnv).mockReturnValue(client as never);

    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([ORG]),
    });
    vi.mocked(db).select = selectMock;

    vi.mocked(db).transaction = vi.fn().mockResolvedValue(undefined);

    const results = await runNetBoxSync();
    expect(results).toHaveLength(1);
    expect(results[0].error).toContain("NetBox unreachable");
  });

  it("skips sync when NETBOX_URL is not set", async () => {
    delete process.env.NETBOX_URL;
    vi.mocked(NetBoxClient.fromEnv).mockImplementation(() => {
      throw new Error("NETBOX_URL and NETBOX_TOKEN must be set");
    });

    await expect(runNetBoxSync()).rejects.toThrow("NETBOX_URL");
  });
});

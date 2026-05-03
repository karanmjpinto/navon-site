/**
 * POST /api/integrations/netbox/webhook
 *
 * Receives real-time change events from NetBox (created/updated/deleted)
 * for dcim.site, dcim.rack, dcim.device, circuits.circuit, tenancy.tenant.
 *
 * Security: HMAC-SHA512 signature over the raw body using the shared secret
 * in NETBOX_WEBHOOK_SECRET. NetBox sends the signature as:
 *   X-Hook-Signature: sha512=<hex>
 *
 * Idempotency: last-1000 request IDs are held in an in-process LRU. Duplicate
 * deliveries (NetBox retries on 5xx) are absorbed with 200 OK.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { orgs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { withOrgContext } from "@/lib/tenant";
import {
  applySite,
  applyRack,
  applyDevice,
  applyCircuit,
  applyVlan,
  applyPrefix,
  applyIpAddress,
  archiveSite,
  archiveRack,
  archiveDevice,
  archiveCircuit,
  resolveSiteId,
  resolveVlanId,
  resolveFirstCabinetId,
} from "@/lib/netbox/apply";
import { recordAudit } from "@/lib/audit";
import { cabinets } from "@/db/schema";
import type {
  NetBoxSite,
  NetBoxRack,
  NetBoxDevice,
  NetBoxCircuit,
  NetBoxTenant,
  NetBoxVlan,
  NetBoxPrefix,
  NetBoxIpAddress,
} from "@/lib/netbox/types";

// ── In-memory LRU for idempotency ────────────────────────────────
const LRU_MAX = 1000;
const seenRequestIds = new Map<string, number>(); // requestId → timestamp

function markSeen(id: string): boolean {
  if (seenRequestIds.has(id)) return true;
  seenRequestIds.set(id, Date.now());
  if (seenRequestIds.size > LRU_MAX) {
    // Evict oldest entry
    const oldest = seenRequestIds.keys().next().value!;
    seenRequestIds.delete(oldest);
  }
  return false;
}

// ── Signature verification ────────────────────────────────────────

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const prefix = "sha512=";
  if (!header.startsWith(prefix)) return false;
  const received = header.slice(prefix.length);
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// ── Payload shape ─────────────────────────────────────────────────

interface WebhookPayload {
  event: "created" | "updated" | "deleted";
  timestamp: string;
  model: string;       // e.g. "dcim.site"
  username: string;
  request_id: string;
  data: Record<string, unknown>;
  snapshots?: {
    prechange?: Record<string, unknown>;
    postchange?: Record<string, unknown>;
  };
}

// ── Org resolver (NetBox tenant slug → Navon orgId) ───────────────

async function resolveOrg(tenantSlug: string | null): Promise<string | null> {
  if (!tenantSlug) return null;
  const rows = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.slug, tenantSlug))
    .limit(1);
  return rows[0]?.id ?? null;
}

function extractTenantSlug(data: Record<string, unknown>): string | null {
  const t = data.tenant as { slug?: string } | null | undefined;
  return t?.slug ?? null;
}

// ── Event handlers ────────────────────────────────────────────────

async function handleSite(event: string, data: Record<string, unknown>, orgId: string): Promise<void> {
  const nb = data as unknown as NetBoxSite;
  if (event === "deleted") {
    await archiveSite(orgId, nb.id);
    return;
  }
  await withOrgContext(orgId, async (tx) => {
    await applySite(tx, nb, orgId);
  });
}

async function handleRack(event: string, data: Record<string, unknown>, orgId: string): Promise<void> {
  const nb = data as unknown as NetBoxRack;
  if (event === "deleted") {
    await archiveRack(orgId, nb.id);
    return;
  }
  const siteId = await withOrgContext(orgId, async (tx) => resolveSiteId(tx, orgId, nb.site.id));
  if (!siteId) {
    console.warn(`[netbox-webhook] rack ${nb.id}: site ${nb.site.id} not found in org ${orgId} — skipping`);
    return;
  }
  await withOrgContext(orgId, async (tx) => {
    await applyRack(tx, nb, orgId, siteId);
  });
}

async function handleDevice(event: string, data: Record<string, unknown>, orgId: string): Promise<void> {
  const nb = data as unknown as NetBoxDevice;
  if (event === "deleted") {
    await archiveDevice(orgId, nb.id);
    return;
  }
  if (!nb.rack) {
    console.warn(`[netbox-webhook] device ${nb.id}: no rack assignment — skipping`);
    return;
  }
  const cabinetId = await withOrgContext(orgId, async (tx) => {
    const rows = await tx
      .select({ id: cabinets.id })
      .from(cabinets)
      .where(and(eq(cabinets.orgId, orgId), eq(cabinets.externalId, `netbox:${nb.rack!.id}`)))
      .limit(1);
    return rows[0]?.id ?? null;
  });
  if (!cabinetId) {
    console.warn(`[netbox-webhook] device ${nb.id}: rack ${nb.rack.id} not synced — skipping`);
    return;
  }
  await withOrgContext(orgId, async (tx) => {
    await applyDevice(tx, nb, orgId, cabinetId);
  });
}

async function handleCircuit(event: string, data: Record<string, unknown>, orgId: string): Promise<void> {
  const nb = data as unknown as NetBoxCircuit;
  if (event === "deleted") {
    await archiveCircuit(orgId, nb.id);
    return;
  }
  const fromCabinetId = await withOrgContext(orgId, async (tx) =>
    resolveFirstCabinetId(tx, orgId),
  );
  if (!fromCabinetId) {
    console.warn(`[netbox-webhook] circuit ${nb.id}: no cabinet found for org ${orgId} — skipping`);
    return;
  }
  await withOrgContext(orgId, async (tx) => {
    await applyCircuit(tx, nb, orgId, fromCabinetId);
  });
}

async function handleVlan(event: string, data: Record<string, unknown>, orgId: string): Promise<void> {
  const nb = data as unknown as NetBoxVlan;
  if (event === "deleted") {
    await withOrgContext(orgId, async (tx) => {
      const { vlans: vlansTable } = await import("@/db/schema");
      await tx.update(vlansTable)
        .set({ lastSyncedAt: new Date() })
        .where(and(eq(vlansTable.orgId, orgId), eq(vlansTable.externalId, `netbox:${nb.id}`)));
    });
    return;
  }
  const siteId = nb.site
    ? await withOrgContext(orgId, async (tx) => resolveSiteId(tx, orgId, nb.site!.id))
    : null;
  await withOrgContext(orgId, async (tx) => {
    await applyVlan(tx, nb, orgId, siteId);
  });
}

async function handlePrefix(event: string, data: Record<string, unknown>, orgId: string): Promise<void> {
  const nb = data as unknown as NetBoxPrefix;
  if (event === "deleted") {
    await withOrgContext(orgId, async (tx) => {
      const { prefixes: prefixesTable } = await import("@/db/schema");
      await tx.update(prefixesTable)
        .set({ lastSyncedAt: new Date() })
        .where(and(eq(prefixesTable.orgId, orgId), eq(prefixesTable.externalId, `netbox:${nb.id}`)));
    });
    return;
  }
  const siteId = nb.site
    ? await withOrgContext(orgId, async (tx) => resolveSiteId(tx, orgId, nb.site!.id))
    : null;
  const vlanId = nb.vlan
    ? await withOrgContext(orgId, async (tx) => resolveVlanId(tx, orgId, nb.vlan!.id))
    : null;
  await withOrgContext(orgId, async (tx) => {
    await applyPrefix(tx, nb, orgId, siteId, vlanId);
  });
}

async function handleIpAddress(event: string, data: Record<string, unknown>, orgId: string): Promise<void> {
  const nb = data as unknown as NetBoxIpAddress;
  if (event === "deleted") {
    await withOrgContext(orgId, async (tx) => {
      const { ipAddresses: ipsTable } = await import("@/db/schema");
      await tx.update(ipsTable)
        .set({ lastSyncedAt: new Date() })
        .where(and(eq(ipsTable.orgId, orgId), eq(ipsTable.externalId, `netbox:${nb.id}`)));
    });
    return;
  }
  await withOrgContext(orgId, async (tx) => {
    await applyIpAddress(tx, nb, orgId, null, null);
  });
}

async function handleTenant(event: string, data: Record<string, unknown>): Promise<void> {
  const nb = data as unknown as NetBoxTenant;
  // We don't create/delete Navon orgs from webhook events — org lifecycle
  // is managed manually. Just log for audit trail visibility.
  console.log(`[netbox-webhook] tenant ${event}: slug=${nb.slug} — no Navon org mutation`);
}

// ── Route handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.NETBOX_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[netbox-webhook] NETBOX_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("x-hook-signature");

  if (!verifySignature(rawBody, sig, secret)) {
    await recordAudit({
      action: "netbox.webhook.rejected",
      targetType: "integration",
      metadata: { reason: "bad_signature", sig: sig?.slice(0, 20) },
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const { event, model, request_id, data } = payload;

  // Idempotency check
  if (markSeen(request_id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (model === "tenancy.tenant") {
      await handleTenant(event, data);
    } else {
      const tenantSlug = extractTenantSlug(data);
      const orgId = await resolveOrg(tenantSlug);
      if (!orgId) {
        console.warn(`[netbox-webhook] ${model} ${event}: tenant "${tenantSlug}" has no Navon org — ignored`);
        return NextResponse.json({ ok: true, ignored: true });
      }

      switch (model) {
        case "dcim.site":         await handleSite(event, data, orgId); break;
        case "dcim.rack":         await handleRack(event, data, orgId); break;
        case "dcim.device":       await handleDevice(event, data, orgId); break;
        case "circuits.circuit":  await handleCircuit(event, data, orgId); break;
        case "ipam.vlan":         await handleVlan(event, data, orgId); break;
        case "ipam.prefix":       await handlePrefix(event, data, orgId); break;
        case "ipam.ipaddress":    await handleIpAddress(event, data, orgId); break;
        default:
          console.log(`[netbox-webhook] unhandled model: ${model}`);
      }
    }

    await recordAudit({
      action: `netbox.webhook.${event}`,
      targetType: model,
      metadata: { model, event, request_id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[netbox-webhook] error handling ${model} ${event}:`, err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

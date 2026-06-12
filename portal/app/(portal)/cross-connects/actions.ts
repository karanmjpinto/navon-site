"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, asc, desc } from "drizzle-orm";
import { z } from "zod";

import {
  crossConnects,
  cabinets,
  sites,
  notifications,
  crossConnectMediaEnum,
  crossConnectTypeEnum,
} from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// ── Reads ──────────────────────────────────────────────────────────

export async function getCrossConnects() {
  const { orgId } = await requireSession();
  return withOrgContext(orgId, (tx) =>
    tx
      .select({
        id: crossConnects.id,
        toLabel: crossConnects.toLabel,
        connectionType: crossConnects.connectionType,
        zSideProvider: crossConnects.zSideProvider,
        speedGbps: crossConnects.speedGbps,
        media: crossConnects.media,
        status: crossConnects.status,
        installFeeMinor: crossConnects.installFeeMinor,
        monthlyChargeMinor: crossConnects.monthlyChargeMinor,
        createdAt: crossConnects.createdAt,
        provisionedAt: crossConnects.provisionedAt,
        decommissionedAt: crossConnects.decommissionedAt,
        fromCabinetLabel: cabinets.label,
        siteName: sites.name,
        siteCode: sites.code,
      })
      .from(crossConnects)
      .leftJoin(cabinets, eq(crossConnects.fromCabinetId, cabinets.id))
      .leftJoin(sites, eq(cabinets.siteId, sites.id))
      .where(eq(crossConnects.orgId, orgId))
      .orderBy(desc(crossConnects.createdAt)),
  );
}

// Cabinets available as the A-side of a new request.
export async function getCabinetOptions() {
  const { orgId } = await requireSession();
  return withOrgContext(orgId, (tx) =>
    tx
      .select({
        id: cabinets.id,
        label: cabinets.label,
        siteName: sites.name,
        siteCode: sites.code,
      })
      .from(cabinets)
      .leftJoin(sites, eq(cabinets.siteId, sites.id))
      .where(and(eq(cabinets.orgId, orgId), eq(cabinets.status, "active")))
      .orderBy(asc(cabinets.label)),
  );
}

// ── Request (customer-facing) ──────────────────────────────────────

const requestSchema = z.object({
  fromCabinetId: z.string().uuid(),
  toLabel: z.string().min(3).max(200),
  connectionType: z.enum(crossConnectTypeEnum.enumValues),
  zSideProvider: z.string().max(160).optional(),
  speedGbps: z.coerce.number().positive().max(1000),
  media: z.enum(crossConnectMediaEnum.enumValues),
  notes: z.string().max(4000).optional(),
});

export async function requestCrossConnect(formData: FormData) {
  const ctx = await requireSession();
  const parsed = requestSchema.safeParse({
    fromCabinetId: formData.get("fromCabinetId"),
    toLabel: formData.get("toLabel"),
    connectionType: formData.get("connectionType"),
    zSideProvider: formData.get("zSideProvider") || undefined,
    speedGbps: formData.get("speedGbps"),
    media: formData.get("media"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    redirect("/cross-connects/new?error=invalid");
  }

  const created = await withOrgContext(ctx.orgId, async (tx) => {
    // Guard: the chosen cabinet must belong to this org (RLS also enforces it).
    const [cab] = await tx
      .select({ id: cabinets.id })
      .from(cabinets)
      .where(
        and(
          eq(cabinets.id, parsed.data.fromCabinetId),
          eq(cabinets.orgId, ctx.orgId),
        ),
      )
      .limit(1);
    if (!cab) return null;

    const [row] = await tx
      .insert(crossConnects)
      .values({
        orgId: ctx.orgId,
        fromCabinetId: parsed.data.fromCabinetId,
        toLabel: parsed.data.toLabel,
        connectionType: parsed.data.connectionType,
        zSideProvider: parsed.data.zSideProvider ?? null,
        speedGbps: parsed.data.speedGbps,
        media: parsed.data.media,
        status: "pending",
        notes: parsed.data.notes ?? null,
        requestedBy: ctx.userId,
        externalSource: "manual",
      })
      .returning();

    await tx.insert(notifications).values({
      orgId: ctx.orgId,
      userId: null, // org-wide: visible to all members
      kind: "system",
      subject: "Cross-connect requested",
      body: `${parsed.data.speedGbps} Gbps ${parsed.data.connectionType} connect to ${parsed.data.toLabel} — pending provisioning.`,
      link: `/cross-connects/${row.id}`,
    });

    return row;
  });

  if (!created) redirect("/cross-connects/new?error=invalid");

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "cross_connect.request",
    targetType: "cross_connect",
    targetId: created.id,
    metadata: {
      connectionType: parsed.data.connectionType,
      speedGbps: parsed.data.speedGbps,
    },
  });

  revalidatePath("/cross-connects");
  redirect(`/cross-connects/${created.id}`);
}

// ── Provision (admin) ──────────────────────────────────────────────

const provisionSchema = z.object({
  id: z.string().uuid(),
  installFee: z.coerce.number().min(0).max(10_000_000).optional(),
  monthlyCharge: z.coerce.number().min(0).max(10_000_000).optional(),
});

export async function provisionCrossConnect(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);

  const parsed = provisionSchema.safeParse({
    id: formData.get("id"),
    installFee: formData.get("installFee") || undefined,
    monthlyCharge: formData.get("monthlyCharge") || undefined,
  });
  if (!parsed.success) return;

  // Money fields arrive as major units (KES) → store as minor (cents).
  const toMinor = (v: number | undefined) =>
    v === undefined ? null : Math.round(v * 100);

  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .update(crossConnects)
      .set({
        status: "provisioned",
        provisionedAt: new Date(),
        installFeeMinor: toMinor(parsed.data.installFee),
        monthlyChargeMinor: toMinor(parsed.data.monthlyCharge),
      })
      .where(
        and(
          eq(crossConnects.id, parsed.data.id),
          eq(crossConnects.orgId, ctx.orgId),
        ),
      ),
  );

  await withOrgContext(ctx.orgId, (tx) =>
    tx.insert(notifications).values({
      orgId: ctx.orgId,
      userId: null,
      kind: "system",
      subject: "Cross-connect provisioned",
      body: "Your cross-connect is live and passing traffic.",
      link: `/cross-connects/${parsed.data.id}`,
    }),
  );

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "cross_connect.provision",
    targetType: "cross_connect",
    targetId: parsed.data.id,
    metadata: {
      installFee: parsed.data.installFee ?? null,
      monthlyCharge: parsed.data.monthlyCharge ?? null,
    },
  });

  revalidatePath("/cross-connects");
  revalidatePath(`/cross-connects/${parsed.data.id}`);
}

// ── Decommission (admin) ───────────────────────────────────────────

const idSchema = z.object({ id: z.string().uuid() });

export async function decommissionCrossConnect(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .update(crossConnects)
      .set({ status: "decommissioned", decommissionedAt: new Date() })
      .where(
        and(
          eq(crossConnects.id, parsed.data.id),
          eq(crossConnects.orgId, ctx.orgId),
        ),
      ),
  );

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "cross_connect.decommission",
    targetType: "cross_connect",
    targetId: parsed.data.id,
  });

  revalidatePath("/cross-connects");
  revalidatePath(`/cross-connects/${parsed.data.id}`);
}

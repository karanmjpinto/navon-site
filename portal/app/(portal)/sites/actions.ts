"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import {
  sites,
  cabinets,
  devices,
  crossConnects,
  cabinetStatusEnum,
  deviceRoleEnum,
  crossConnectMediaEnum,
  crossConnectStatusEnum,
} from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";

// ── Sites ─────────────────────────────────────────────────────────
const siteSchema = z.object({
  name: z.string().min(1).max(160),
  code: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, dashes only"),
  address: z.string().max(400).optional(),
  country: z.string().min(2).max(2).default("KE"),
});

export async function createSite(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const parsed = siteSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") ?? undefined,
    country: formData.get("country") ?? "KE",
  });
  if (!parsed.success) redirect("/sites?error=invalid");

  const [created] = await withOrgContext(ctx.orgId, (tx) =>
    tx.insert(sites).values({ orgId: ctx.orgId, ...parsed.data }).returning(),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "site.create",
    targetType: "site",
    targetId: created.id,
  });
  revalidatePath("/sites");
  redirect(`/sites/${created.id}`);
}

// ── Cabinets ──────────────────────────────────────────────────────
const cabinetSchema = z.object({
  siteId: z.string().uuid(),
  label: z.string().min(1).max(40),
  rackUnits: z.coerce.number().int().min(1).max(60).default(47),
  powerCapKw: z.coerce.number().min(0.5).max(200).default(6),
  status: z.enum(cabinetStatusEnum.enumValues).default("active"),
});

export async function createCabinet(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin", "technical"]);
  const parsed = cabinetSchema.safeParse({
    siteId: formData.get("siteId"),
    label: formData.get("label"),
    rackUnits: formData.get("rackUnits"),
    powerCapKw: formData.get("powerCapKw"),
    status: formData.get("status") ?? "active",
  });
  if (!parsed.success) {
    redirect(`/sites/${formData.get("siteId")}?error=invalid`);
  }
  const [created] = await withOrgContext(ctx.orgId, (tx) =>
    tx.insert(cabinets).values({ orgId: ctx.orgId, ...parsed.data }).returning(),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "cabinet.create",
    targetType: "cabinet",
    targetId: created.id,
  });
  revalidatePath(`/sites/${parsed.data.siteId}`);
  redirect(`/cabinets/${created.id}`);
}

// ── Devices ───────────────────────────────────────────────────────
const deviceSchema = z.object({
  cabinetId: z.string().uuid(),
  label: z.string().min(1).max(120),
  vendor: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  serial: z.string().max(120).optional(),
  role: z.enum(deviceRoleEnum.enumValues).default("compute"),
  rackUStart: z.coerce.number().int().min(1).max(60).optional(),
  rackUSize: z.coerce.number().int().min(1).max(20).default(1),
});

export async function createDevice(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin", "technical"]);
  const parsed = deviceSchema.safeParse({
    cabinetId: formData.get("cabinetId"),
    label: formData.get("label"),
    vendor: formData.get("vendor") ?? undefined,
    model: formData.get("model") ?? undefined,
    serial: formData.get("serial") ?? undefined,
    role: formData.get("role") ?? "compute",
    rackUStart: formData.get("rackUStart") || undefined,
    rackUSize: formData.get("rackUSize") || 1,
  });
  if (!parsed.success) {
    redirect(`/cabinets/${formData.get("cabinetId")}?error=invalid`);
  }
  const [created] = await withOrgContext(ctx.orgId, (tx) =>
    tx.insert(devices).values({ orgId: ctx.orgId, ...parsed.data }).returning(),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "device.create",
    targetType: "device",
    targetId: created.id,
  });
  revalidatePath(`/cabinets/${parsed.data.cabinetId}`);
}

export async function deleteDevice(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin", "technical"]);
  const id = formData.get("id") as string;
  const cabinetId = formData.get("cabinetId") as string;
  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .delete(devices)
      .where(and(eq(devices.id, id), eq(devices.orgId, ctx.orgId))),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "device.delete",
    targetType: "device",
    targetId: id,
  });
  revalidatePath(`/cabinets/${cabinetId}`);
}

// ── Cross-connects ────────────────────────────────────────────────
const xcSchema = z.object({
  fromCabinetId: z.string().uuid(),
  toLabel: z.string().min(1).max(200),
  speedGbps: z.coerce.number().positive().max(1000),
  media: z.enum(crossConnectMediaEnum.enumValues).default("fiber_sm"),
  status: z.enum(crossConnectStatusEnum.enumValues).default("pending"),
});

export async function createCrossConnect(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin", "technical"]);
  const parsed = xcSchema.safeParse({
    fromCabinetId: formData.get("fromCabinetId"),
    toLabel: formData.get("toLabel"),
    speedGbps: formData.get("speedGbps"),
    media: formData.get("media") ?? "fiber_sm",
    status: formData.get("status") ?? "pending",
  });
  if (!parsed.success) {
    redirect(`/cabinets/${formData.get("fromCabinetId")}?error=invalid`);
  }
  const [created] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .insert(crossConnects)
      .values({
        orgId: ctx.orgId,
        ...parsed.data,
        provisionedAt:
          parsed.data.status === "provisioned" ? new Date() : null,
      })
      .returning(),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "cross_connect.create",
    targetType: "cross_connect",
    targetId: created.id,
  });
  revalidatePath(`/cabinets/${parsed.data.fromCabinetId}`);
}

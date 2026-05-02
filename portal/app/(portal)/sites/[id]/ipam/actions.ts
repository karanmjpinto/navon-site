"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ipRanges, ipAssignments, sites } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { isValidCidr, isValidIpv4, ipInCidr } from "@/lib/ip";

const rangeSchema = z.object({
  siteId: z.string().uuid(),
  cidr: z.string().refine(isValidCidr, "Must be a valid IPv4 CIDR"),
  description: z.string().max(200).optional(),
  gateway: z
    .string()
    .optional()
    .refine((v) => !v || isValidIpv4(v), "Must be a valid IPv4 address"),
  vlanId: z.coerce.number().int().min(0).max(4094).optional(),
});

export async function createRange(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin", "technical"]);
  const parsed = rangeSchema.safeParse({
    siteId: formData.get("siteId"),
    cidr: (formData.get("cidr") as string)?.trim(),
    description: formData.get("description") ?? undefined,
    gateway: (formData.get("gateway") as string)?.trim() || undefined,
    vlanId: formData.get("vlanId") || undefined,
  });
  if (!parsed.success) {
    redirect(`/sites/${formData.get("siteId")}/ipam?error=invalid`);
  }

  const [created] = await withOrgContext(ctx.orgId, async (tx) => {
    // Confirm site belongs to this org
    const [s] = await tx
      .select()
      .from(sites)
      .where(
        and(eq(sites.id, parsed.data.siteId), eq(sites.orgId, ctx.orgId)),
      )
      .limit(1);
    if (!s) throw new Error("site_not_found");
    return tx
      .insert(ipRanges)
      .values({ orgId: ctx.orgId, ...parsed.data })
      .returning();
  });

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "ip_range.create",
    targetType: "ip_range",
    targetId: created.id,
    metadata: { cidr: parsed.data.cidr },
  });
  revalidatePath(`/sites/${parsed.data.siteId}/ipam`);
  redirect(`/sites/${parsed.data.siteId}/ipam/${created.id}`);
}

const assignSchema = z.object({
  rangeId: z.string().uuid(),
  address: z.string().refine(isValidIpv4, "Must be a valid IPv4 address"),
  label: z.string().max(160).optional(),
  deviceId: z.string().uuid().optional().or(z.literal("")),
});

export async function createAssignment(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin", "technical"]);
  const parsed = assignSchema.safeParse({
    rangeId: formData.get("rangeId"),
    address: (formData.get("address") as string)?.trim(),
    label: (formData.get("label") as string) ?? undefined,
    deviceId: (formData.get("deviceId") as string) ?? undefined,
  });
  if (!parsed.success) {
    redirect(
      `/sites/x/ipam/${formData.get("rangeId")}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "invalid")}`,
    );
  }

  const result = await withOrgContext(ctx.orgId, async (tx) => {
    const [range] = await tx
      .select()
      .from(ipRanges)
      .where(
        and(eq(ipRanges.id, parsed.data.rangeId), eq(ipRanges.orgId, ctx.orgId)),
      )
      .limit(1);
    if (!range) return { error: "range_not_found" as const };
    if (!ipInCidr(parsed.data.address, range.cidr)) {
      return { error: "address_outside_range" as const, range };
    }
    const [assignment] = await tx
      .insert(ipAssignments)
      .values({
        orgId: ctx.orgId,
        rangeId: range.id,
        address: parsed.data.address,
        label: parsed.data.label || null,
        deviceId: parsed.data.deviceId ? parsed.data.deviceId : null,
      })
      .returning();
    return { ok: true as const, range, assignment };
  });

  if ("error" in result) {
    redirect(
      `/sites/x/ipam/${parsed.data.rangeId}?error=${result.error}`,
    );
  }

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "ip_assignment.create",
    targetType: "ip_assignment",
    targetId: result.assignment.id,
    metadata: { address: parsed.data.address },
  });
  revalidatePath(`/sites/${result.range.siteId}/ipam/${result.range.id}`);
}

export async function deleteAssignment(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin", "technical"]);
  const id = formData.get("id") as string;
  const rangeId = formData.get("rangeId") as string;
  const siteId = formData.get("siteId") as string;
  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .delete(ipAssignments)
      .where(
        and(
          eq(ipAssignments.id, id),
          eq(ipAssignments.orgId, ctx.orgId),
        ),
      ),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "ip_assignment.delete",
    targetType: "ip_assignment",
    targetId: id,
  });
  revalidatePath(`/sites/${siteId}/ipam/${rangeId}`);
}

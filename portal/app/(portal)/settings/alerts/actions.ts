"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  alertRules,
  alertMetricEnum,
  alertComparisonEnum,
} from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  metric: z.enum(alertMetricEnum.enumValues),
  comparison: z.enum(alertComparisonEnum.enumValues),
  threshold: z.coerce.number(),
  sustainedMinutes: z.coerce.number().int().min(1).max(60).default(5),
  notifyEmail: z
    .union([z.literal("on"), z.literal("off"), z.undefined()])
    .transform((v) => v === "on"),
});

export async function createAlertRule(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    metric: formData.get("metric"),
    comparison: formData.get("comparison"),
    threshold: formData.get("threshold"),
    sustainedMinutes: formData.get("sustainedMinutes"),
    notifyEmail: formData.get("notifyEmail") ?? "off",
  });
  if (!parsed.success) redirect("/settings/alerts?error=invalid");

  const [created] = await db
    .insert(alertRules)
    .values({
      orgId: ctx.orgId,
      createdBy: ctx.userId,
      ...parsed.data,
    })
    .returning();

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "alert_rule.create",
    targetType: "alert_rule",
    targetId: created.id,
    metadata: parsed.data,
  });
  revalidatePath("/settings/alerts");
}

export async function toggleAlertRule(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const id = formData.get("id") as string;
  const enabled = formData.get("enabled") === "true";
  await db
    .update(alertRules)
    .set({ enabled: !enabled })
    .where(and(eq(alertRules.id, id), eq(alertRules.orgId, ctx.orgId)));
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "alert_rule.toggle",
    targetType: "alert_rule",
    targetId: id,
    metadata: { enabled: !enabled },
  });
  revalidatePath("/settings/alerts");
}

export async function deleteAlertRule(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const id = formData.get("id") as string;
  await db
    .delete(alertRules)
    .where(and(eq(alertRules.id, id), eq(alertRules.orgId, ctx.orgId)));
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "alert_rule.delete",
    targetType: "alert_rule",
    targetId: id,
  });
  revalidatePath("/settings/alerts");
}

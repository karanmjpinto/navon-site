"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  maintenanceWindows,
  maintenanceScopeEnum,
  notifications,
  memberships,
  users,
} from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const schema = z
  .object({
    scope: z.enum(maintenanceScopeEnum.enumValues),
    targetId: z.string().uuid().optional().or(z.literal("")),
    summary: z.string().min(1).max(200),
    body: z.string().max(8000).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

export async function createMaintenance(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const parsed = schema.safeParse({
    scope: formData.get("scope"),
    targetId: formData.get("targetId") ?? undefined,
    summary: formData.get("summary"),
    body: formData.get("body") ?? undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) redirect("/settings/maintenance?error=invalid");

  const [created] = await db
    .insert(maintenanceWindows)
    .values({
      orgId: ctx.orgId,
      createdBy: ctx.userId,
      scope: parsed.data.scope,
      targetId: parsed.data.targetId || null,
      summary: parsed.data.summary,
      body: parsed.data.body ?? null,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    })
    .returning();

  // Notify all org members in-app + email.
  const members = await db
    .select({ userId: memberships.userId, email: users.email })
    .from(memberships)
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.orgId));

  if (members.length > 0) {
    await db.insert(notifications).values(
      members.map((m) => ({
        orgId: ctx.orgId,
        userId: m.userId,
        kind: "system" as const,
        subject: `Scheduled maintenance: ${parsed.data.summary}`,
        body: `Window: ${parsed.data.startsAt.toUTCString()} – ${parsed.data.endsAt.toUTCString()}`,
        link: "/maintenance",
      })),
    );
    const emails = members
      .map((m) => m.email)
      .filter((e): e is string => !!e);
    if (emails.length > 0) {
      await sendEmail({
        to: emails,
        subject: `Scheduled maintenance: ${parsed.data.summary}`,
        text:
          `${parsed.data.body ?? parsed.data.summary}\n\n` +
          `Window:\n` +
          `  Start: ${parsed.data.startsAt.toUTCString()}\n` +
          `  End:   ${parsed.data.endsAt.toUTCString()}\n`,
      });
    }
  }

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "maintenance.create",
    targetType: "maintenance_window",
    targetId: created.id,
  });
  revalidatePath("/settings/maintenance");
  revalidatePath("/dashboard");
}

export async function deleteMaintenance(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const id = formData.get("id") as string;
  await db
    .delete(maintenanceWindows)
    .where(
      and(
        eq(maintenanceWindows.id, id),
        eq(maintenanceWindows.orgId, ctx.orgId),
      ),
    );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "maintenance.delete",
    targetType: "maintenance_window",
    targetId: id,
  });
  revalidatePath("/settings/maintenance");
  revalidatePath("/dashboard");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";

import { db } from "@/db";
import { invites, memberships, users, orgs, roleEnum } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const inviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(roleEnum.enumValues),
});

const INVITE_TTL_DAYS = 7;

export async function inviteMember(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) redirect("/settings/team?error=invalid");

  const token = crypto.randomBytes(24).toString("base64url");
  await withOrgContext(ctx.orgId, (tx) =>
    tx.insert(invites).values({
      orgId: ctx.orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invitedBy: ctx.userId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600_000),
    }),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "invite.create",
    targetType: "invite",
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  // Best-effort email. No-ops in local dev if AUTH_RESEND_KEY is unset.
  try {
    const [org] = await db.select().from(orgs).where(eq(orgs.id, ctx.orgId)).limit(1);
    const base = process.env.AUTH_URL ?? "http://localhost:3002";
    const link = `${base}/accept-invite?token=${token}`;
    await sendEmail({
      to: parsed.data.email,
      subject: `${ctx.name ?? "A teammate"} invited you to ${org?.name ?? "Navon Portal"}`,
      text:
        `You've been invited to join ${org?.name ?? "the Navon Portal"} as ${parsed.data.role}.\n\n` +
        `Accept the invite (signed in with ${parsed.data.email}):\n${link}\n\n` +
        `This link expires in ${INVITE_TTL_DAYS} days.`,
    });
  } catch (err) {
    console.error("[invite] email send failed", err);
  }

  revalidatePath("/settings/team");
}

export async function revokeInvite(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const id = formData.get("id") as string;
  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .delete(invites)
      .where(and(eq(invites.id, id), eq(invites.orgId, ctx.orgId))),
  );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "invite.revoke",
    targetType: "invite",
    targetId: id,
  });
  revalidatePath("/settings/team");
}

export async function changeRole(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const userId = formData.get("userId") as string;
  const role = formData.get("role");
  const parsed = z.enum(roleEnum.enumValues).safeParse(role);
  if (!parsed.success) return;

  // Don't let an admin demote themselves if they're the only admin.
  if (userId === ctx.userId && parsed.data !== "admin") {
    const admins = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.orgId, ctx.orgId), eq(memberships.role, "admin")),
      );
    if (admins.length <= 1) {
      redirect("/settings/team?error=last_admin");
    }
  }

  await db
    .update(memberships)
    .set({ role: parsed.data })
    .where(
      and(eq(memberships.userId, userId), eq(memberships.orgId, ctx.orgId)),
    );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "membership.role_change",
    targetType: "user",
    targetId: userId,
    metadata: { to: parsed.data },
  });
  revalidatePath("/settings/team");
}

export async function removeMember(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const userId = formData.get("userId") as string;
  if (userId === ctx.userId) {
    redirect("/settings/team?error=self_remove");
  }
  await db
    .delete(memberships)
    .where(
      and(eq(memberships.userId, userId), eq(memberships.orgId, ctx.orgId)),
    );
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "membership.remove",
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/settings/team");
}

// Used by the public /accept-invite page (route handler) to redeem a
// token. Not exported to UI: called by the route handler directly.
export async function redeemInvite(token: string, userId: string) {
  const [inv] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), isNull(invites.acceptedAt)))
    .limit(1);
  if (!inv) return null;
  if (inv.expiresAt < new Date()) return null;

  // Verify the signed-in user's email matches the invite.
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.email.toLowerCase() !== inv.email) return null;

  await db.transaction(async (tx) => {
    await tx
      .insert(memberships)
      .values({ userId, orgId: inv.orgId, role: inv.role })
      .onConflictDoUpdate({
        target: [memberships.userId, memberships.orgId],
        set: { role: inv.role },
      });
    await tx
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, inv.id));
  });
  return inv.orgId;
}

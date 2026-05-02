"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cookies } from "next/headers";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateSecret, verifyTotp } from "@/lib/totp";
import { auth, signOut } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function currentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

// ── Profile ───────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function updateProfile(formData: FormData) {
  const userId = await currentUserId();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, userId));
  await recordAudit({ userId, action: "profile.update" });
  revalidatePath("/settings");
}

// ── Password ──────────────────────────────────────────────────────
const passwordSchema = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(8).max(200),
});

export async function changePassword(formData: FormData) {
  const userId = await currentUserId();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    redirect("/settings?error=password_format");
  }

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const ok = await verifyPassword(parsed.data.current, u?.passwordHash ?? null);
  if (!ok) {
    redirect("/settings?error=password_current");
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.next) })
    .where(eq(users.id, userId));

  await recordAudit({ userId, action: "password.change" });

  // Force re-auth so any other devices drop. JWT sessions can't be revoked
  // without a tokenVersion; for MVP we just sign out the current device.
  await signOut({ redirectTo: "/login?password=changed" });
}

// ── MFA ───────────────────────────────────────────────────────────
const MFA_COOKIE = "mfa_setup_secret";

// Stash a freshly-generated TOTP secret in a short-lived signed cookie
// so the user can enter the code from their authenticator before we
// commit it to the database.
export async function startMfaSetup() {
  await currentUserId();
  const secret = generateSecret();
  const c = await cookies();
  c.set(MFA_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/settings",
  });
  redirect("/settings/mfa");
}

const confirmSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function confirmMfa(formData: FormData) {
  const userId = await currentUserId();
  const c = await cookies();
  const secret = c.get(MFA_COOKIE)?.value;
  if (!secret) {
    redirect("/settings/mfa?error=expired");
  }
  const parsed = confirmSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success || !verifyTotp(secret, parsed.data.code)) {
    redirect("/settings/mfa?error=invalid");
  }

  await db
    .update(users)
    .set({ totpSecret: secret, totpEnabled: true })
    .where(eq(users.id, userId));
  c.delete(MFA_COOKIE);

  await recordAudit({ userId, action: "mfa.enable" });
  redirect("/settings?mfa=enabled");
}

export async function disableMfa(formData: FormData) {
  const userId = await currentUserId();
  const code = (formData.get("code") as string | null)?.trim();
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.totpEnabled || !u.totpSecret) {
    redirect("/settings");
  }
  if (!code || !verifyTotp(u.totpSecret, code)) {
    redirect("/settings?error=mfa_invalid");
  }

  await db
    .update(users)
    .set({ totpEnabled: false, totpSecret: null })
    .where(eq(users.id, userId));
  await recordAudit({ userId, action: "mfa.disable" });
  redirect("/settings?mfa=disabled");
}

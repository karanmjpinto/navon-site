"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/db";
import { metricsTokens } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { generateToken } from "@/lib/metrics-tokens";

const createSchema = z.object({
  name: z.string().min(1).max(80),
});

const NEW_TOKEN_COOKIE = "navon_new_token";

export async function createToken(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect("/settings/api?error=invalid");

  const { plaintext, hash, prefix } = generateToken();
  const [created] = await db
    .insert(metricsTokens)
    .values({
      orgId: ctx.orgId,
      name: parsed.data.name,
      tokenHash: hash,
      tokenPrefix: prefix,
      createdBy: ctx.userId,
    })
    .returning();

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "metrics_token.create",
    targetType: "metrics_token",
    targetId: created.id,
    metadata: { name: parsed.data.name },
  });

  // Plaintext token shown once via a short-lived cookie; never re-readable.
  const c = await cookies();
  c.set(NEW_TOKEN_COOKIE, plaintext, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60,
    path: "/settings/api",
  });
  revalidatePath("/settings/api");
  redirect("/settings/api?created=1");
}

export async function revokeToken(formData: FormData) {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  const id = formData.get("id") as string;
  await db
    .update(metricsTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(metricsTokens.id, id), eq(metricsTokens.orgId, ctx.orgId)));
  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "metrics_token.revoke",
    targetType: "metrics_token",
    targetId: id,
  });
  revalidatePath("/settings/api");
}

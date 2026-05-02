import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { memberships, type Role } from "@/db/schema";

export async function userMembership(userId: string, orgId: string) {
  const [m] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
    .limit(1);
  return m ?? null;
}

export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

export async function requireRole(
  userId: string,
  orgId: string,
  allowed: Role[],
) {
  const m = await userMembership(userId, orgId);
  if (!m || !hasRole(m.role, allowed)) {
    throw new Error("forbidden");
  }
  return m;
}

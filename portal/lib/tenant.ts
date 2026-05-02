import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { auth } from "@/lib/auth";

// Resolve the current org context for a logged-in user.
// MVP rule: a user belongs to exactly one org. Replace with a session-stored
// selection + an org switcher when multi-org users land.
export async function currentOrgId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  return rows[0]?.orgId ?? null;
}

export type SessionContext = {
  userId: string;
  orgId: string;
  email: string;
  name: string | null;
};

// Resolve { userId, orgId } for the current request, throwing if unauthenticated
// or if the user has no org membership. Use at the top of every protected
// server action / page that touches tenant data.
export async function requireSession(): Promise<SessionContext> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("unauthorized");
  const orgId = await currentOrgId(userId);
  if (!orgId) throw new Error("no_org_membership");
  return {
    userId,
    orgId,
    email: session!.user!.email ?? "",
    name: session!.user!.name ?? null,
  };
}

// Run a callback inside a Postgres transaction with `app.current_org_id`
// set so RLS policies admit only this tenant's rows. Use for every read
// or write that touches a tenant-scoped table.
export async function withOrgContext<T>(
  orgId: string,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_org_id', ${orgId}, true)`,
    );
    return fn(tx);
  });
}

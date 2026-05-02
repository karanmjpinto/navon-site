"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireSession } from "@/lib/tenant";

export async function markRead(formData: FormData) {
  const ctx = await requireSession();
  const id = formData.get("id") as string;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.orgId, ctx.orgId),
        or(
          eq(notifications.userId, ctx.userId),
          isNull(notifications.userId),
        ),
      ),
    );
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllRead() {
  const ctx = await requireSession();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.orgId, ctx.orgId),
        or(
          eq(notifications.userId, ctx.userId),
          isNull(notifications.userId),
        ),
        isNull(notifications.readAt),
      ),
    );
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function unreadCount(
  userId: string,
  orgId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.orgId, orgId),
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId),
        ),
        isNull(notifications.readAt),
      ),
    );
  return row?.n ?? 0;
}

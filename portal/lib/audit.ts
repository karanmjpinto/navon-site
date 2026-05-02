import { headers } from "next/headers";
import { db } from "@/db";
import { auditEvents } from "@/db/schema";

type Audit = {
  orgId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

// Append-only audit trail. Writes are best-effort: we never block a user
// action on audit log failure, but we surface errors in server logs.
export async function recordAudit(event: Audit): Promise<void> {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    userAgent = h.get("user-agent") ?? null;
  } catch {
    // headers() is unavailable outside request scope (eg. cron) — ignore
  }

  try {
    await db.insert(auditEvents).values({
      orgId: event.orgId ?? null,
      userId: event.userId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      ip,
      userAgent,
      metadata: event.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit] insert failed", err);
  }
}

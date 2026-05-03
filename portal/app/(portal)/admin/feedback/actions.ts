"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  feedback,
  feedbackComments,
  feedbackAttachments,
  workOrders,
  feedbackStatusEnum,
  workOrderPriorityEnum,
  users,
} from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { notifySubmitterStatusChange, notifySubmitterComment } from "@/lib/feedback-notify";

async function adminCtx() {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  return ctx;
}

export async function listFeedback(opts?: {
  status?: string;
  severity?: string;
  userId?: string;
}) {
  const ctx = await adminCtx();
  const rows = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .select({
        id: feedback.id,
        title: feedback.title,
        severity: feedback.severity,
        status: feedback.status,
        createdAt: feedback.createdAt,
        userId: feedback.userId,
        submitterName: users.name,
        submitterEmail: users.email,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .where(eq(feedback.orgId, ctx.orgId))
      .orderBy(desc(feedback.createdAt))
      .limit(200),
  );

  return rows.filter((r) => {
    if (opts?.status && r.status !== opts.status) return false;
    if (opts?.severity && r.severity !== opts.severity) return false;
    if (opts?.userId && r.userId !== opts.userId) return false;
    return true;
  });
}

export async function getFeedbackDetail(id: string) {
  const ctx = await adminCtx();
  return withOrgContext(ctx.orgId, async (tx) => {
    const [item] = await tx
      .select({
        id: feedback.id,
        title: feedback.title,
        description: feedback.description,
        reason: feedback.reason,
        severity: feedback.severity,
        status: feedback.status,
        rejectionReason: feedback.rejectionReason,
        workOrderId: feedback.workOrderId,
        url: feedback.url,
        viewport: feedback.viewport,
        userAgent: feedback.userAgent,
        createdAt: feedback.createdAt,
        userId: feedback.userId,
        submitterName: users.name,
        submitterEmail: users.email,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .where(and(eq(feedback.id, id), eq(feedback.orgId, ctx.orgId)))
      .limit(1);
    if (!item) return null;

    const attachments = await tx
      .select()
      .from(feedbackAttachments)
      .where(eq(feedbackAttachments.feedbackId, id))
      .orderBy(asc(feedbackAttachments.createdAt));

    const comments = await tx
      .select({
        id: feedbackComments.id,
        body: feedbackComments.body,
        createdAt: feedbackComments.createdAt,
        userId: feedbackComments.userId,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(feedbackComments)
      .leftJoin(users, eq(feedbackComments.userId, users.id))
      .where(eq(feedbackComments.feedbackId, id))
      .orderBy(asc(feedbackComments.createdAt));

    return { item, attachments, comments };
  });
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(feedbackStatusEnum.enumValues),
  rejectionReason: z.string().max(1000).optional(),
});

export async function updateFeedbackStatus(formData: FormData) {
  const ctx = await adminCtx();
  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    rejectionReason: formData.get("rejectionReason") || undefined,
  });
  if (!parsed.success) return;

  const [updated] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .update(feedback)
      .set({
        status: parsed.data.status,
        rejectionReason: parsed.data.rejectionReason ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(feedback.id, parsed.data.id), eq(feedback.orgId, ctx.orgId)))
      .returning({ userId: feedback.userId }),
  );

  if (updated) {
    await recordAudit({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "feedback.status_change",
      targetType: "feedback",
      targetId: parsed.data.id,
      metadata: { status: parsed.data.status },
    });
    try {
      await notifySubmitterStatusChange(ctx.orgId, updated.userId, parsed.data.id, parsed.data.status);
    } catch {}
  }

  revalidatePath(`/admin/feedback/${parsed.data.id}`);
  revalidatePath("/admin/feedback");
}

const commentSchema = z.object({
  feedbackId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function addFeedbackComment(formData: FormData) {
  const ctx = await adminCtx();
  const parsed = commentSchema.safeParse({
    feedbackId: formData.get("feedbackId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;

  const [item] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .select({ userId: feedback.userId })
      .from(feedback)
      .where(and(eq(feedback.id, parsed.data.feedbackId), eq(feedback.orgId, ctx.orgId)))
      .limit(1),
  );
  if (!item) return;

  await withOrgContext(ctx.orgId, (tx) =>
    tx.insert(feedbackComments).values({
      feedbackId: parsed.data.feedbackId,
      orgId: ctx.orgId,
      userId: ctx.userId,
      body: parsed.data.body,
    }),
  );

  try {
    await notifySubmitterComment(ctx.orgId, item.userId, ctx.userId, parsed.data.feedbackId);
  } catch {}

  revalidatePath(`/admin/feedback/${parsed.data.feedbackId}`);
}

const convertSchema = z.object({
  feedbackId: z.string().uuid(),
  title: z.string().min(3).max(160),
  description: z.string().min(3).max(4000),
  priority: z.enum(workOrderPriorityEnum.enumValues),
  dueDate: z.string().optional(),
});

export async function convertToWorkOrder(formData: FormData) {
  const ctx = await adminCtx();
  const parsed = convertSchema.safeParse({
    feedbackId: formData.get("feedbackId"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return;

  const [fbRow] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .select({ status: feedback.status, userId: feedback.userId })
      .from(feedback)
      .where(and(eq(feedback.id, parsed.data.feedbackId), eq(feedback.orgId, ctx.orgId)))
      .limit(1),
  );
  if (!fbRow || fbRow.status === "converted") return;

  const [wo] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .insert(workOrders)
      .values({
        orgId: ctx.orgId,
        sourceFeedbackId: parsed.data.feedbackId,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ?? null,
        createdBy: ctx.userId,
      })
      .returning(),
  );

  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .update(feedback)
      .set({ status: "converted", workOrderId: wo.id, updatedAt: new Date() })
      .where(eq(feedback.id, parsed.data.feedbackId)),
  );

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "feedback.converted",
    targetType: "work_order",
    targetId: wo.id,
    metadata: { feedbackId: parsed.data.feedbackId },
  });

  try {
    await notifySubmitterStatusChange(ctx.orgId, fbRow.userId, parsed.data.feedbackId, "converted");
  } catch {}

  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/feedback/${parsed.data.feedbackId}`);
  revalidatePath("/admin/work-orders");
}

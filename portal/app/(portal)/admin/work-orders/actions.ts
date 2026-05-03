"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import {
  workOrders,
  workOrderComments,
  workOrderStatusEnum,
  workOrderPriorityEnum,
  users,
  feedback,
} from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { requireRole } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

async function adminCtx() {
  const ctx = await requireSession();
  await requireRole(ctx.userId, ctx.orgId, ["admin"]);
  return ctx;
}

export async function listWorkOrders(opts?: { status?: string; priority?: string }) {
  const ctx = await adminCtx();
  const rows = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .select({
        id: workOrders.id,
        title: workOrders.title,
        priority: workOrders.priority,
        status: workOrders.status,
        dueDate: workOrders.dueDate,
        createdAt: workOrders.createdAt,
        assigneeId: workOrders.assigneeId,
        assigneeName: users.name,
        sourceFeedbackId: workOrders.sourceFeedbackId,
      })
      .from(workOrders)
      .leftJoin(users, eq(workOrders.assigneeId, users.id))
      .where(eq(workOrders.orgId, ctx.orgId))
      .orderBy(desc(workOrders.createdAt))
      .limit(200),
  );

  return rows.filter((r) => {
    if (opts?.status && r.status !== opts.status) return false;
    if (opts?.priority && r.priority !== opts.priority) return false;
    return true;
  });
}

export async function getWorkOrderDetail(id: string) {
  const ctx = await adminCtx();
  return withOrgContext(ctx.orgId, async (tx) => {
    const [item] = await tx
      .select({
        id: workOrders.id,
        title: workOrders.title,
        description: workOrders.description,
        priority: workOrders.priority,
        status: workOrders.status,
        dueDate: workOrders.dueDate,
        createdAt: workOrders.createdAt,
        updatedAt: workOrders.updatedAt,
        assigneeId: workOrders.assigneeId,
        assigneeName: users.name,
        sourceFeedbackId: workOrders.sourceFeedbackId,
        createdBy: workOrders.createdBy,
      })
      .from(workOrders)
      .leftJoin(users, eq(workOrders.assigneeId, users.id))
      .where(and(eq(workOrders.id, id), eq(workOrders.orgId, ctx.orgId)))
      .limit(1);
    if (!item) return null;

    const comments = await tx
      .select({
        id: workOrderComments.id,
        body: workOrderComments.body,
        createdAt: workOrderComments.createdAt,
        userId: workOrderComments.userId,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(workOrderComments)
      .leftJoin(users, eq(workOrderComments.userId, users.id))
      .where(eq(workOrderComments.workOrderId, id))
      .orderBy(asc(workOrderComments.createdAt));

    let sourceFeedback = null;
    if (item.sourceFeedbackId) {
      const [fb] = await tx
        .select({ id: feedback.id, title: feedback.title, status: feedback.status })
        .from(feedback)
        .where(eq(feedback.id, item.sourceFeedbackId))
        .limit(1);
      sourceFeedback = fb ?? null;
    }

    return { item, comments, sourceFeedback };
  });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(workOrderStatusEnum.enumValues).optional(),
  priority: z.enum(workOrderPriorityEnum.enumValues).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function updateWorkOrder(formData: FormData) {
  const ctx = await adminCtx();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status") || undefined,
    priority: formData.get("priority") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return;

  const { id, ...fields } = parsed.data;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.status) set.status = fields.status;
  if (fields.priority) set.priority = fields.priority;
  if (fields.assigneeId !== undefined) set.assigneeId = fields.assigneeId || null;
  if (fields.dueDate !== undefined) set.dueDate = fields.dueDate || null;

  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .update(workOrders)
      .set(set)
      .where(and(eq(workOrders.id, id), eq(workOrders.orgId, ctx.orgId))),
  );

  if (fields.status) {
    await recordAudit({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "work_order.status_change",
      targetType: "work_order",
      targetId: id,
      metadata: { status: fields.status },
    });
  }

  revalidatePath(`/admin/work-orders/${id}`);
  revalidatePath("/admin/work-orders");
}

const commentSchema = z.object({
  workOrderId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function addWorkOrderComment(formData: FormData) {
  const ctx = await adminCtx();
  const parsed = commentSchema.safeParse({
    workOrderId: formData.get("workOrderId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;

  const exists = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(and(eq(workOrders.id, parsed.data.workOrderId), eq(workOrders.orgId, ctx.orgId)))
      .limit(1),
  );
  if (!exists.length) return;

  await withOrgContext(ctx.orgId, (tx) =>
    tx.insert(workOrderComments).values({
      workOrderId: parsed.data.workOrderId,
      orgId: ctx.orgId,
      userId: ctx.userId,
      body: parsed.data.body,
    }),
  );

  revalidatePath(`/admin/work-orders/${parsed.data.workOrderId}`);
}

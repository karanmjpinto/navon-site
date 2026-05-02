"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import {
  tickets,
  ticketComments,
  ticketServiceEnum,
  ticketPriorityEnum,
  ticketStatusEnum,
} from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";

const createSchema = z.object({
  subject: z.string().min(3).max(160),
  body: z.string().min(3).max(8000),
  serviceType: z.enum(ticketServiceEnum.enumValues),
  priority: z.enum(ticketPriorityEnum.enumValues),
});

export async function createTicket(formData: FormData) {
  const ctx = await requireSession();
  const parsed = createSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    serviceType: formData.get("serviceType"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    redirect("/tickets/new?error=invalid");
  }

  const slaHours =
    parsed.data.priority === "urgent" ? 2 : parsed.data.priority === "high" ? 8 : 24;

  const [created] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .insert(tickets)
      .values({
        orgId: ctx.orgId,
        createdBy: ctx.userId,
        ...parsed.data,
        slaDueAt: new Date(Date.now() + slaHours * 3600_000),
      })
      .returning(),
  );

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "ticket.create",
    targetType: "ticket",
    targetId: created.id,
  });

  revalidatePath("/tickets");
  redirect(`/tickets/${created.id}`);
}

const commentSchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().min(1).max(8000),
});

export async function addComment(formData: FormData) {
  const ctx = await requireSession();
  const parsed = commentSchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;

  await withOrgContext(ctx.orgId, async (tx) => {
    await tx.insert(ticketComments).values({
      ticketId: parsed.data.ticketId,
      orgId: ctx.orgId,
      authorId: ctx.userId,
      body: parsed.data.body,
    });
    await tx
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(
        and(eq(tickets.id, parsed.data.ticketId), eq(tickets.orgId, ctx.orgId)),
      );
  });

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "ticket.comment",
    targetType: "ticket",
    targetId: parsed.data.ticketId,
  });

  revalidatePath(`/tickets/${parsed.data.ticketId}`);
}

const statusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(ticketStatusEnum.enumValues),
});

export async function changeStatus(formData: FormData) {
  const ctx = await requireSession();
  const parsed = statusSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const patch: Partial<typeof tickets.$inferInsert> = {
    status: parsed.data.status,
    updatedAt: new Date(),
  };
  if (parsed.data.status === "resolved") patch.resolvedAt = new Date();
  if (parsed.data.status === "closed") patch.closedAt = new Date();

  await withOrgContext(ctx.orgId, (tx) =>
    tx
      .update(tickets)
      .set(patch)
      .where(
        and(eq(tickets.id, parsed.data.ticketId), eq(tickets.orgId, ctx.orgId)),
      ),
  );

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "ticket.status",
    targetType: "ticket",
    targetId: parsed.data.ticketId,
    metadata: { to: parsed.data.status },
  });

  revalidatePath(`/tickets/${parsed.data.ticketId}`);
  revalidatePath("/tickets");
}

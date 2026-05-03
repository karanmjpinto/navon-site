"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { feedback, feedbackAttachments, feedbackSeverityEnum } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { saveFeedbackAttachment } from "@/lib/uploads";
import { notifyAdminsNewFeedback } from "@/lib/feedback-notify";

const submitSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(3).max(4000),
  reason: z.string().min(3).max(4000),
  severity: z.enum(feedbackSeverityEnum.enumValues),
  url: z.string().max(2000).optional(),
  viewport: z.string().max(100).optional(),
  userAgent: z.string().max(500).optional(),
});

export type SubmitState = { success: boolean; error?: string } | null;

export async function submitFeedback(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  let ctx: Awaited<ReturnType<typeof requireSession>>;
  try {
    ctx = await requireSession();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = submitSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    reason: formData.get("reason"),
    severity: formData.get("severity"),
    url: formData.get("url") || undefined,
    viewport: formData.get("viewport") || undefined,
    userAgent: formData.get("userAgent") || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: "Validation failed. Check required fields." };
  }

  const files = formData.getAll("screenshots") as File[];
  const validFiles = files.filter((f) => f.size > 0);

  const [created] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .insert(feedback)
      .values({
        orgId: ctx.orgId,
        userId: ctx.userId,
        ...parsed.data,
      })
      .returning(),
  );

  for (const file of validFiles) {
    try {
      const saved = await saveFeedbackAttachment(created.id, ctx.orgId, file);
      await db.insert(feedbackAttachments).values({
        feedbackId: created.id,
        orgId: ctx.orgId,
        filename: saved.filename,
        storagePath: saved.storagePath,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
      });
    } catch (err) {
      console.error("[feedback] attachment save failed", err);
    }
  }

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "feedback.create",
    targetType: "feedback",
    targetId: created.id,
    metadata: { severity: parsed.data.severity },
  });

  try {
    await notifyAdminsNewFeedback(ctx.orgId, ctx.userId, created.id, parsed.data.title);
  } catch (err) {
    console.error("[feedback] admin notify failed", err);
  }

  revalidatePath("/feedback");
  return { success: true };
}

export async function getMyFeedback() {
  const ctx = await requireSession();
  return withOrgContext(ctx.orgId, (tx) =>
    tx
      .select()
      .from(feedback)
      .where(and(eq(feedback.orgId, ctx.orgId), eq(feedback.userId, ctx.userId)))
      .orderBy(desc(feedback.createdAt))
      .limit(50),
  );
}

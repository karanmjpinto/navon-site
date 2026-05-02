import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, notifications } from "@/db/schema";

// Notify all admins in the org about a new feedback submission.
export async function notifyAdminsNewFeedback(
  orgId: string,
  submitterId: string,
  feedbackId: string,
  title: string,
) {
  const admins = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.orgId, orgId));

  const adminIds = admins
    .map((m) => m.userId)
    .filter((id) => id !== submitterId);

  if (adminIds.length === 0) return;

  await db.insert(notifications).values(
    adminIds.map((userId) => ({
      orgId,
      userId,
      kind: "info" as const,
      subject: `New feedback: ${title}`,
      body: "A team member submitted new portal feedback for review.",
      link: `/admin/feedback/${feedbackId}`,
    })),
  );
}

// Notify the submitter when an admin changes the status of their feedback.
export async function notifySubmitterStatusChange(
  orgId: string,
  submitterId: string,
  feedbackId: string,
  newStatus: string,
) {
  const label: Record<string, string> = {
    reviewed: "Your feedback has been reviewed.",
    accepted: "Your feedback has been accepted.",
    rejected: "Your feedback was not accepted.",
    converted: "Your feedback has been converted to a work order.",
  };
  const body = label[newStatus];
  if (!body) return;

  await db.insert(notifications).values({
    orgId,
    userId: submitterId,
    kind: "info" as const,
    subject: `Feedback update`,
    body,
    link: `/feedback`,
  });
}

// Notify the submitter when a comment is added to their feedback.
export async function notifySubmitterComment(
  orgId: string,
  submitterId: string,
  commenterId: string,
  feedbackId: string,
) {
  if (submitterId === commenterId) return;
  await db.insert(notifications).values({
    orgId,
    userId: submitterId,
    kind: "info" as const,
    subject: "New comment on your feedback",
    body: "An admin left a comment on your feedback item.",
    link: `/feedback`,
  });
}

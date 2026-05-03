import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { feedbackAttachments } from "@/db/schema";
import { readAttachment } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx: Awaited<ReturnType<typeof requireSession>>;
  try {
    ctx = await requireSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const [att] = await withOrgContext(ctx.orgId, (tx) =>
    tx
      .select()
      .from(feedbackAttachments)
      .where(
        and(
          eq(feedbackAttachments.id, id),
          eq(feedbackAttachments.orgId, ctx.orgId),
        ),
      )
      .limit(1),
  );

  if (!att) return new Response("Not found", { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await readAttachment(att.storagePath);
  } catch {
    return new Response("File not found on disk", { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `inline; filename="${att.filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

import { eq, and } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { invoices, invoiceLines, orgs } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { InvoicePdf } from "@/lib/pdf-invoice";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await requireSession();

  const data = await withOrgContext(session.orgId, async (tx) => {
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.orgId, session.orgId)))
      .limit(1);
    if (!inv) return null;
    const lines = await tx
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, id));
    const [org] = await tx
      .select()
      .from(orgs)
      .where(eq(orgs.id, session.orgId))
      .limit(1);
    return { inv, lines, org };
  });

  if (!data || !data.org) return new Response("Not found", { status: 404 });

  await recordAudit({
    orgId: session.orgId,
    userId: session.userId,
    action: "invoice.download",
    targetType: "invoice",
    targetId: id,
  });

  const buf = await renderToBuffer(
    InvoicePdf({ invoice: data.inv, lines: data.lines, org: data.org }),
  );

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

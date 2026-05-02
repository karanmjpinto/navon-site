import { eq, and } from "drizzle-orm";
import { invoices, invoiceLines } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";

function csvEscape(s: unknown): string {
  const v = s == null ? "" : String(s);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

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
    return { inv, lines };
  });

  if (!data) return new Response("Not found", { status: 404 });

  const rows: string[] = [];
  rows.push(
    [
      "invoice_number",
      "period_start",
      "period_end",
      "category",
      "description",
      "quantity",
      "unit_price",
      "amount",
      "currency",
    ].join(","),
  );
  for (const l of data.lines) {
    rows.push(
      [
        data.inv.number,
        data.inv.periodStart.toISOString().slice(0, 10),
        data.inv.periodEnd.toISOString().slice(0, 10),
        l.category,
        csvEscape(l.description),
        l.quantity,
        (l.unitPriceMinor / 100).toFixed(2),
        (l.amountMinor / 100).toFixed(2),
        data.inv.currency,
      ].join(","),
    );
  }

  await recordAudit({
    orgId: session.orgId,
    userId: session.userId,
    action: "invoice.export_csv",
    targetType: "invoice",
    targetId: id,
  });

  return new Response(rows.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${data.inv.number}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

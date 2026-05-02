import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { invoices, invoiceLines } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { date, money } from "@/lib/format";

export default async function InvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();

  const data = await withOrgContext(orgId, async (tx) => {
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
      .limit(1);
    if (!inv) return null;
    const lines = await tx
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, id));
    return { invoice: inv, lines };
  });

  if (!data) notFound();
  const { invoice, lines } = data;

  return (
    <div className="max-w-3xl">
      <Link
        href="/billing"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All invoices
      </Link>

      <div className="mt-6 mb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate mb-2">
            Invoice
          </p>
          <h1 className="text-3xl font-medium tracking-tight font-mono">
            {invoice.number}
          </h1>
          <p className="text-mid text-sm mt-2">
            Period {date(invoice.periodStart)} – {date(invoice.periodEnd)} ·
            issued {date(invoice.issuedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status !== "paid" && (
            <Link
              href={`/billing/${invoice.id}/pay`}
              className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
            >
              Pay with M-Pesa
            </Link>
          )}
          <a
            href={`/billing/${invoice.id}/pdf`}
            className="text-[13px] tracking-wide px-4 py-3 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
          >
            PDF
          </a>
          <a
            href={`/billing/${invoice.id}/csv`}
            className="text-[13px] tracking-wide px-4 py-3 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
          >
            CSV
          </a>
        </div>
      </div>

      <div className="border border-charcoal">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
              <th className="py-3 px-4 border-b border-charcoal">Category</th>
              <th className="py-3 px-4 border-b border-charcoal">
                Description
              </th>
              <th className="py-3 px-4 border-b border-charcoal text-right">
                Qty
              </th>
              <th className="py-3 px-4 border-b border-charcoal text-right">
                Unit
              </th>
              <th className="py-3 px-4 border-b border-charcoal text-right">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-charcoal/60">
                <td className="py-4 px-4 capitalize text-paper">{l.category}</td>
                <td className="py-4 px-4 text-mid">{l.description}</td>
                <td className="py-4 px-4 text-right text-mid">
                  {l.quantity.toLocaleString("en-KE", {
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-4 px-4 text-right text-mid">
                  {money(l.unitPriceMinor, invoice.currency)}
                </td>
                <td className="py-4 px-4 text-right">
                  {money(l.amountMinor, invoice.currency)}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="py-4 px-4 text-right font-medium">
                Total due
              </td>
              <td className="py-4 px-4 text-right font-medium text-signal">
                {money(invoice.totalMinor, invoice.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { desc } from "drizzle-orm";
import { invoices, type InvoiceStatus } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { date, money } from "@/lib/format";

const STATUS_CHIP: Record<InvoiceStatus, string> = {
  draft: "bg-ink-2 text-mid border border-charcoal",
  issued: "bg-paper text-ink",
  paid: "bg-signal text-ink",
  overdue: "bg-red-500/30 text-red-200 border border-red-500/40",
  void: "bg-charcoal text-mid",
};

export default async function BillingPage() {
  const { orgId } = await requireSession();

  const rows = await withOrgContext(orgId, (tx) =>
    tx.select().from(invoices).orderBy(desc(invoices.issuedAt)).limit(50),
  );

  return (
    <div className="max-w-6xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
        Billing
      </p>
      <h1 className="text-3xl font-medium tracking-tight">Invoices</h1>
      <p className="text-mid text-sm mt-2 mb-10">
        Statements for power, space, bandwidth, and services. Click an invoice
        to download the PDF.
      </p>

      {rows.length === 0 ? (
        <div className="border border-dashed border-charcoal p-12 text-center text-mid text-sm">
          No invoices yet. The first will appear after your first billing
          period closes.
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
              <th className="py-3 border-b border-charcoal">Number</th>
              <th className="py-3 border-b border-charcoal">Period</th>
              <th className="py-3 border-b border-charcoal">Issued</th>
              <th className="py-3 border-b border-charcoal">Due</th>
              <th className="py-3 border-b border-charcoal text-right">
                Total
              </th>
              <th className="py-3 border-b border-charcoal text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-charcoal hover:bg-ink-2 transition-colors duration-100"
              >
                <td className="py-4 pr-6">
                  <Link
                    href={`/billing/${inv.id}`}
                    className="font-mono hover:text-signal transition-colors duration-150 ease-navon"
                  >
                    {inv.number}
                  </Link>
                </td>
                <td className="py-4 pr-6 text-mid">
                  {date(inv.periodStart)} – {date(inv.periodEnd)}
                </td>
                <td className="py-4 pr-6 text-mid">{date(inv.issuedAt)}</td>
                <td className="py-4 pr-6 text-mid">{date(inv.dueAt)}</td>
                <td className="py-4 pr-6 text-right">
                  {money(inv.totalMinor, inv.currency)}
                </td>
                <td className="py-4 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] ${STATUS_CHIP[inv.status]}`}
                  >
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

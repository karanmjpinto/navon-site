import Link from "next/link";
import { desc } from "drizzle-orm";
import { tickets, type TicketStatus } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { relativeTime } from "@/lib/format";

const STATUS_CHIP: Record<TicketStatus, string> = {
  open: "bg-signal text-ink",
  in_progress: "bg-paper text-ink",
  resolved: "bg-charcoal text-paper",
  closed: "bg-ink-2 text-mid border border-charcoal",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function TicketsPage() {
  const { orgId } = await requireSession();

  const rows = await withOrgContext(orgId, (tx) =>
    tx.select().from(tickets).orderBy(desc(tickets.updatedAt)).limit(50),
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
            Service requests
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Tickets</h1>
          <p className="text-mid text-sm mt-2">
            Remote hands, cross-connects, bandwidth changes, and other facility
            requests.
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
        >
          New request
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-charcoal p-12 text-center text-mid text-sm">
          No tickets yet. Click <span className="text-paper">New request</span>{" "}
          to raise the first one.
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
              <th className="py-3 border-b border-charcoal">Subject</th>
              <th className="py-3 border-b border-charcoal">Type</th>
              <th className="py-3 border-b border-charcoal">Priority</th>
              <th className="py-3 border-b border-charcoal">Status</th>
              <th className="py-3 border-b border-charcoal text-right">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.id}
                className="border-b border-charcoal hover:bg-ink-2 transition-colors duration-100"
              >
                <td className="py-4 pr-6">
                  <Link
                    href={`/tickets/${t.id}`}
                    className="hover:text-signal transition-colors duration-150 ease-navon"
                  >
                    {t.subject}
                  </Link>
                </td>
                <td className="py-4 pr-6 text-mid capitalize">
                  {t.serviceType.replace("_", " ")}
                </td>
                <td className="py-4 pr-6 text-mid capitalize">{t.priority}</td>
                <td className="py-4 pr-6">
                  <span
                    className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] ${STATUS_CHIP[t.status]}`}
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>
                <td className="py-4 text-right text-mid">
                  {relativeTime(t.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

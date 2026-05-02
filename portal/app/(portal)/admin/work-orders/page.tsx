import Link from "next/link";
import { listWorkOrders } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  open: "text-signal border-signal",
  in_progress: "text-paper border-paper",
  blocked: "text-signal border-signal",
  done: "text-mid border-charcoal",
};

const PRI_COLOR: Record<string, string> = {
  critical: "text-signal border-signal",
  high: "text-paper border-paper",
  medium: "text-mid border-charcoal",
  low: "text-slate border-charcoal",
};

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const sp = await searchParams;
  const items = await listWorkOrders({ status: sp.status, priority: sp.priority });

  const statuses = ["", "open", "in_progress", "blocked", "done"];
  const priorities = ["", "low", "medium", "high", "critical"];

  return (
    <div className="max-w-6xl">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
            Admin · Work orders
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Work orders</h1>
        </div>
        <Link
          href="/admin/feedback"
          className="text-[13px] font-mono uppercase tracking-[0.18em] text-mid hover:text-paper transition-colors duration-150 ease-navon"
        >
          ← Feedback queue
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate mr-2">Status:</span>
        {statuses.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `?status=${s}${sp.priority ? `&priority=${sp.priority}` : ""}` : `?${sp.priority ? `priority=${sp.priority}` : ""}`}
            className={`text-[11px] font-mono uppercase tracking-[0.14em] px-3 py-1 border transition-colors duration-100 ${
              (sp.status ?? "") === s ? "border-signal text-signal" : "border-charcoal text-mid hover:border-slate"
            }`}
          >
            {s || "All"}
          </Link>
        ))}
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate ml-4 mr-2">Priority:</span>
        {priorities.map((p) => (
          <Link
            key={p || "all"}
            href={p ? `?priority=${p}${sp.status ? `&status=${sp.status}` : ""}` : `?${sp.status ? `status=${sp.status}` : ""}`}
            className={`text-[11px] font-mono uppercase tracking-[0.14em] px-3 py-1 border transition-colors duration-100 ${
              (sp.priority ?? "") === p ? "border-signal text-signal" : "border-charcoal text-mid hover:border-slate"
            }`}
          >
            {p || "All"}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-charcoal p-12 text-center text-mid text-sm">
          No work orders yet. Convert feedback items to create work orders.
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate border-b border-charcoal">
              <th className="pb-3 pr-6">Title</th>
              <th className="pb-3 pr-4">Priority</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Assignee</th>
              <th className="pb-3 pr-4">Due</th>
              <th className="pb-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-charcoal hover:bg-ink-2 transition-colors duration-100">
                <td className="py-4 pr-6">
                  <Link
                    href={`/admin/work-orders/${item.id}`}
                    className="text-paper hover:text-signal transition-colors duration-150 ease-navon"
                  >
                    {item.title}
                  </Link>
                  {item.sourceFeedbackId && (
                    <span className="ml-2 text-[10px] font-mono text-slate">from feedback</span>
                  )}
                </td>
                <td className="py-4 pr-4">
                  <Chip label={item.priority} colors={PRI_COLOR} />
                </td>
                <td className="py-4 pr-4">
                  <Chip label={item.status} colors={STATUS_COLOR} />
                </td>
                <td className="py-4 pr-4 text-mid text-xs">
                  {item.assigneeName ?? "—"}
                </td>
                <td className="py-4 pr-4 text-mid text-xs">
                  {item.dueDate ?? "—"}
                </td>
                <td className="py-4 text-mid text-xs">
                  {item.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Chip({ label, colors }: { label: string; colors: Record<string, string> }) {
  const cls = colors[label] ?? "text-mid border-charcoal";
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] border ${cls}`}>
      {label.replace("_", " ")}
    </span>
  );
}

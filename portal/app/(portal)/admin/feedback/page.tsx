import Link from "next/link";
import { listFeedback } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  new: "text-signal border-signal",
  reviewed: "text-mid border-charcoal",
  accepted: "text-paper border-paper",
  rejected: "text-slate border-charcoal",
  converted: "text-mid border-charcoal",
};

const SEV_COLOR: Record<string, string> = {
  high: "text-signal border-signal",
  medium: "text-mid border-charcoal",
  low: "text-slate border-charcoal",
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  const sp = await searchParams;
  const items = await listFeedback({ status: sp.status, severity: sp.severity });

  const statuses = ["", "new", "reviewed", "accepted", "rejected", "converted"];
  const severities = ["", "low", "medium", "high"];

  return (
    <div className="max-w-6xl">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
            Admin · Feedback
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Feedback queue</h1>
        </div>
        <Link
          href="/admin/work-orders"
          className="text-[13px] font-mono uppercase tracking-[0.18em] text-mid hover:text-paper transition-colors duration-150 ease-navon"
        >
          Work orders →
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate mr-2">Status:</span>
        {statuses.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `?status=${s}${sp.severity ? `&severity=${sp.severity}` : ""}` : `?${sp.severity ? `severity=${sp.severity}` : ""}`}
            className={`text-[11px] font-mono uppercase tracking-[0.14em] px-3 py-1 border transition-colors duration-100 ${
              (sp.status ?? "") === s ? "border-signal text-signal" : "border-charcoal text-mid hover:border-slate"
            }`}
          >
            {s || "All"}
          </Link>
        ))}
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate ml-4 mr-2">Severity:</span>
        {severities.map((v) => (
          <Link
            key={v || "all"}
            href={v ? `?severity=${v}${sp.status ? `&status=${sp.status}` : ""}` : `?${sp.status ? `status=${sp.status}` : ""}`}
            className={`text-[11px] font-mono uppercase tracking-[0.14em] px-3 py-1 border transition-colors duration-100 ${
              (sp.severity ?? "") === v ? "border-signal text-signal" : "border-charcoal text-mid hover:border-slate"
            }`}
          >
            {v || "All"}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-charcoal p-12 text-center text-mid text-sm">
          No feedback items match the current filters.
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate border-b border-charcoal">
              <th className="pb-3 pr-6">Title</th>
              <th className="pb-3 pr-4">Severity</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Submitter</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-charcoal hover:bg-ink-2 transition-colors duration-100">
                <td className="py-4 pr-6">
                  <Link
                    href={`/admin/feedback/${item.id}`}
                    className="text-paper hover:text-signal transition-colors duration-150 ease-navon"
                  >
                    {item.title}
                  </Link>
                </td>
                <td className="py-4 pr-4">
                  <Chip label={item.severity} colors={SEV_COLOR} />
                </td>
                <td className="py-4 pr-4">
                  <Chip label={item.status} colors={STATUS_COLOR} />
                </td>
                <td className="py-4 pr-4 text-mid text-xs">
                  {item.submitterName ?? item.submitterEmail ?? item.userId.slice(0, 8)}
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
      {label}
    </span>
  );
}

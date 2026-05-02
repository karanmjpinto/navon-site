import { getMyFeedback } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  new: "text-mid border-charcoal",
  reviewed: "text-slate border-charcoal",
  accepted: "text-signal border-signal",
  rejected: "text-signal border-signal",
  converted: "text-paper border-paper",
};

export default async function MyFeedbackPage() {
  const items = await getMyFeedback();

  return (
    <div className="max-w-4xl">
      <div className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
          My feedback
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Submitted feedback</h1>
        <p className="mt-3 text-sm text-mid max-w-lg">
          Issues and ideas you&apos;ve sent to the Navon team. Use the Feedback button to add new items.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-charcoal p-12 text-center text-mid text-sm">
          No feedback submitted yet. Use the Feedback button (bottom-right) to get started.
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate border-b border-charcoal">
              <th className="pb-3 pr-6">Title</th>
              <th className="pb-3 pr-6">Severity</th>
              <th className="pb-3 pr-6">Status</th>
              <th className="pb-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-charcoal hover:bg-ink-2 transition-colors duration-100">
                <td className="py-4 pr-6 max-w-xs">
                  <span className="text-paper">{item.title}</span>
                  {item.rejectionReason && (
                    <p className="text-xs text-mid mt-0.5 truncate">{item.rejectionReason}</p>
                  )}
                </td>
                <td className="py-4 pr-6">
                  <Chip label={item.severity} />
                </td>
                <td className="py-4 pr-6">
                  <span className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] border ${STATUS_COLOR[item.status] ?? "text-mid border-charcoal"}`}>
                    {item.status}
                  </span>
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

function Chip({ label }: { label: string }) {
  const cls =
    label === "high"
      ? "text-signal border-signal"
      : label === "medium"
        ? "text-mid border-charcoal"
        : "text-slate border-charcoal";
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] border ${cls}`}>
      {label}
    </span>
  );
}

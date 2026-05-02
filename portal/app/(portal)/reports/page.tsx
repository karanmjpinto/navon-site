import Link from "next/link";
import { PageTitle } from "@/components/forms";

const REPORTS = [
  {
    href: "/reports/uptime",
    label: "Uptime & SLA",
    sub: "Service availability over a chosen window. Power, network, and platform tracked separately.",
  },
  {
    href: "/reports/capacity",
    label: "Capacity forecast",
    sub: "Trend analysis on power, kWh, and bandwidth. Projects when you'll cross your committed cap.",
  },
] as const;

export default function ReportsIndex() {
  return (
    <div className="max-w-4xl space-y-10">
      <PageTitle
        eyebrow="Reporting & analytics"
        title="Reports"
        sub="Operational reports for SLA review, capacity planning, and procurement evidence. Each report has CSV export."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-charcoal border border-charcoal">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="bg-ink p-6 hover:bg-ink-2 transition-colors duration-100 group"
          >
            <h3 className="text-lg font-medium tracking-tight mb-2 group-hover:text-signal transition-colors">
              {r.label}
            </h3>
            <p className="text-sm text-mid">{r.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

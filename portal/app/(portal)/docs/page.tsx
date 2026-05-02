import Link from "next/link";
import { PageTitle, Card } from "@/components/forms";

const SECTIONS = [
  {
    eyebrow: "Compliance",
    title: "Certifications & policies",
    items: [
      {
        label: "ISO 27001 Statement of Applicability",
        href: "/docs/iso-27001",
        sub: "Information security controls and scope",
      },
      {
        label: "SOC 2 Type I report",
        href: "/docs/soc-2",
        sub: "Trust Services Criteria — Security, Availability, Confidentiality",
      },
      {
        label: "Kenya Data Protection Act 2019 — Data map",
        href: "/docs/kenya-dpa",
        sub: "Categories of data, lawful bases, retention windows",
      },
      {
        label: "Sub-processor list",
        href: "/docs/sub-processors",
        sub: "All third parties that may receive customer data",
      },
    ],
  },
  {
    eyebrow: "Operations",
    title: "How we run",
    items: [
      {
        label: "Service Level Agreement",
        href: "/docs/sla",
        sub: "Power, network, and remote-hands targets",
      },
      {
        label: "Change management policy",
        href: "/docs/change-management",
        sub: "Maintenance windows and notification cadence",
      },
      {
        label: "Incident response runbook",
        href: "/docs/incident-response",
        sub: "What happens when there's an outage",
      },
      {
        label: "Disaster recovery plan",
        href: "/docs/disaster-recovery",
        sub: "Backups, RPO, RTO, geographic redundancy",
      },
    ],
  },
  {
    eyebrow: "Technical",
    title: "Connecting your gear",
    items: [
      {
        label: "Cabinet & power requirements",
        href: "/docs/cabinet-spec",
        sub: "47U / 6 kW standard, 8 kW high-density option",
      },
      {
        label: "Cross-connect ordering guide",
        href: "/docs/cross-connects",
        sub: "Lead times, media options, MMR layout",
      },
      {
        label: "Metrics ingestion API",
        href: "/docs/metrics-api",
        sub: "POST /api/metrics — DCIM/BMS integration",
      },
      {
        label: "M-Pesa Daraja integration",
        href: "/docs/mpesa",
        sub: "STK push flow and reconciliation",
      },
    ],
  },
] as const;

export default function DocsIndex() {
  return (
    <div className="max-w-4xl space-y-12">
      <PageTitle
        eyebrow="Knowledge base"
        title="Docs"
        sub="Compliance documents, operational runbooks, and technical guides for connecting your infrastructure to Navon."
      />

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
            {section.eyebrow}
          </p>
          <h2 className="text-xl font-medium tracking-tight mb-5">
            {section.title}
          </h2>
          <div className="border border-charcoal divide-y divide-charcoal">
            {section.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="block bg-ink-2 hover:bg-ink p-5 group transition-colors duration-100"
              >
                <p className="text-sm group-hover:text-signal transition-colors">
                  {it.label}
                </p>
                <p className="text-xs text-mid mt-1">{it.sub}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <Card title="Need something not listed?">
        <p className="text-sm text-mid">
          Compliance docs are renewed quarterly. If you need an older version,
          a redacted excerpt for a procurement review, or a mutual NDA before a
          report is shared, raise a{" "}
          <Link
            href="/tickets/new"
            className="text-paper underline underline-offset-4"
          >
            service request
          </Link>{" "}
          and we'll have the relevant document over within one business day.
        </p>
      </Card>
    </div>
  );
}

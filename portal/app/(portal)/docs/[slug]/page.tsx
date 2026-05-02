import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/forms";

// MVP placeholder content. Until each compliance + operational doc is
// produced and signed off, surfaces give buyers a clear scope and the
// rough shape of the artefact so they know what to expect.
const DOCS: Record<
  string,
  {
    eyebrow: string;
    title: string;
    summary: string;
    sections: Array<{ title: string; body: string }>;
  }
> = {
  "iso-27001": {
    eyebrow: "Compliance",
    title: "ISO/IEC 27001 — Statement of Applicability",
    summary:
      "Information security management system covering all Navon infrastructure within the Hells Gate Deep Tech Park.",
    sections: [
      {
        title: "Scope",
        body: "All physical, network, and software systems operating under the Navon brand at the Hells Gate site, including modular DCs, sovereign cloud platform, and customer portal.",
      },
      {
        title: "Annex A controls",
        body: "All 93 Annex A controls assessed for applicability. The current SoA is available on request to certified buyers under NDA — raise a service request and reference 'ISO 27001 SoA'.",
      },
      {
        title: "Continuous improvement",
        body: "Internal audits run twice yearly; surveillance audit by our certifying body annually; full recertification every three years.",
      },
    ],
  },
  "soc-2": {
    eyebrow: "Compliance",
    title: "SOC 2 Type I report",
    summary:
      "Independent attestation against the AICPA Trust Services Criteria for Security, Availability, and Confidentiality.",
    sections: [
      {
        title: "Reporting period",
        body: "Type I covers a point-in-time as of 30 June 2026. Type II report covering the 12 months to 30 June 2027 in progress.",
      },
      {
        title: "Auditor",
        body: "BDO East Africa LLP. Engagement letter and final report available on request under NDA.",
      },
    ],
  },
  "kenya-dpa": {
    eyebrow: "Compliance",
    title: "Kenya Data Protection Act 2019 — Data map",
    summary:
      "Categories of personal data Navon processes, the lawful basis for each, retention windows, and where the data is stored.",
    sections: [
      {
        title: "Account data",
        body: "Names, work emails, hashed passwords, TOTP secrets. Lawful basis: contract performance. Retention: lifetime of the account + 90 days. Storage: Hells Gate site, Kenya.",
      },
      {
        title: "Tenant operational data",
        body: "Tickets, billing records, audit events, infrastructure metrics. Lawful basis: contract performance and legitimate interest in service operation. Retention: 7 years (financial records) / 1 year (operational metrics). Storage: Hells Gate site, Kenya.",
      },
      {
        title: "Sub-processors",
        body: "Resend (transactional email — recipient address only). All other processing happens on Navon-operated infrastructure within Kenya.",
      },
    ],
  },
  "sub-processors": {
    eyebrow: "Compliance",
    title: "Sub-processor list",
    summary:
      "Third parties that may receive customer-derived data, the categories of data shared, and where they process it.",
    sections: [
      {
        title: "Resend",
        body: "Transactional email delivery (magic links, invite emails, ticket notifications). Receives recipient email addresses and the message body. Processed in the EU / US.",
      },
      {
        title: "Safaricom Daraja",
        body: "M-Pesa STK push for invoice payment. Receives the customer-provided phone number and amount. Processed in Kenya.",
      },
    ],
  },
  sla: {
    eyebrow: "Operations",
    title: "Service Level Agreement",
    summary:
      "Headline targets. Full SLA with credits and exclusions is in your Master Services Agreement.",
    sections: [
      {
        title: "Power",
        body: "99.99% availability per cabinet, measured at the inlet to your equipment. Two independent feeds standard.",
      },
      {
        title: "Network",
        body: "99.95% availability for committed bandwidth. Measured at the customer-side port of the cross-connect.",
      },
      {
        title: "Remote hands",
        body: "Acknowledged within 15 minutes 24×7. Action commenced within: 1h (urgent) / 4h (high) / next business day (normal).",
      },
    ],
  },
  "change-management": {
    eyebrow: "Operations",
    title: "Change management policy",
    summary:
      "Maintenance windows, customer notification cadence, and emergency-change escalation.",
    sections: [
      {
        title: "Standard maintenance",
        body: "Scheduled within the weekly window: Sunday 02:00–06:00 EAT. Customers notified at least 7 days in advance, again 24h before, and on completion.",
      },
      {
        title: "Emergency change",
        body: "Used only for security or safety. Customers notified as soon as feasible, with a written post-action review within 5 business days.",
      },
    ],
  },
  "incident-response": {
    eyebrow: "Operations",
    title: "Incident response runbook",
    summary: "How we triage, communicate, and remediate when something breaks.",
    sections: [
      {
        title: "Detection",
        body: "Monitoring at the cabinet (power), network (latency, loss), and platform (synthetic transactions) levels. Alerts page on-call within 60 seconds of breach.",
      },
      {
        title: "Communication",
        body: "Status page updated within 10 minutes. Direct customer notification (email + portal alert) within 30 minutes for any incident affecting your services.",
      },
      {
        title: "Post-incident review",
        body: "Blameless review published within 5 business days for any P1/P2 incident, including root cause and remediation plan.",
      },
    ],
  },
  "disaster-recovery": {
    eyebrow: "Operations",
    title: "Disaster recovery plan",
    summary: "Backup strategy, RPO/RTO, and geographic redundancy posture.",
    sections: [
      {
        title: "Backups",
        body: "Postgres: nightly full + 5-minute WAL archives, restic-encrypted to off-site object storage in two regions. Tested restore monthly.",
      },
      {
        title: "Targets",
        body: "RPO ≤ 5 minutes for billing and audit data. RTO ≤ 4 hours for the customer portal control plane. Tenant compute is handled per the customer's own DR plan.",
      },
    ],
  },
  "cabinet-spec": {
    eyebrow: "Technical",
    title: "Cabinet & power requirements",
    summary: "Standard and high-density configurations available at Hells Gate.",
    sections: [
      {
        title: "Standard cabinet",
        body: "47U usable space, 6 kW power cap, A+B feeds at 32A 415V, front-door biometric lock, blanking panels supplied.",
      },
      {
        title: "High-density cabinet",
        body: "47U, 8–12 kW, in-row liquid cooling, dedicated returns. Available in row D onwards. Lead time 4 weeks.",
      },
      {
        title: "Bring-your-own gear",
        body: "Acceptable: standard 19\" / 600mm × 1200mm. Not acceptable: equipment exceeding the cabinet's power cap or rated outside the cooling envelope of the row.",
      },
    ],
  },
  "cross-connects": {
    eyebrow: "Technical",
    title: "Cross-connect ordering guide",
    summary: "How to provision interconnects between your cabinet and others.",
    sections: [
      {
        title: "Lead times",
        body: "Intra-site (cabinet-to-cabinet): 1 business day. Cabinet-to-MMR: 3 business days. Inter-site (Hells Gate ↔ Nairobi MMR): 10 business days.",
      },
      {
        title: "Media options",
        body: "Single-mode fiber up to 100G LR4. Multi-mode fiber up to 40G SR4. Cat6A copper up to 10G.",
      },
      {
        title: "How to order",
        body: "Open a service request from the Tickets tab and select 'Cross-connect'. Or, from any cabinet detail page, use 'Request a cross-connect'.",
      },
    ],
  },
  "metrics-api": {
    eyebrow: "Technical",
    title: "Metrics ingestion API",
    summary:
      "POST telemetry from your DCIM/BMS into the dashboard. Bearer-token auth, idempotent batches.",
    sections: [
      {
        title: "Endpoint",
        body: "POST /api/metrics — body: { points: [{ ts, powerKw, powerKwh, tempC, bandwidthGbps }, ...] }. Up to 2000 points per call. Returns 202 with { accepted: <count> }.",
      },
      {
        title: "Authentication",
        body: "Authorization: Bearer <token>. Generate tokens at Settings → Ingestion API. Tokens are SHA-256 hashed at rest; the plaintext is shown once at creation.",
      },
      {
        title: "Idempotency",
        body: "Points are upserted by (org_id, ts), so retries with the same timestamps are safe. Use the same ts on retries; do not jitter.",
      },
    ],
  },
  mpesa: {
    eyebrow: "Technical",
    title: "M-Pesa Daraja integration",
    summary: "STK push flow for invoice payment.",
    sections: [
      {
        title: "Customer flow",
        body: "Open an unpaid invoice → 'Pay with M-Pesa' → enter Safaricom number → approve the prompt on phone → invoice marks paid via callback.",
      },
      {
        title: "Operator setup",
        body: "Production requires Daraja shortcode, consumer key/secret, and passkey. These are configured server-side; customers don't manage credentials.",
      },
      {
        title: "Reconciliation",
        body: "Each payment row carries the Daraja CheckoutRequestID and ResultCode for audit. Failed payments are visible in the invoice's payment history.",
      },
    ],
  },
};

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  return (
    <article className="max-w-2xl">
      <Link
        href="/docs"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All docs
      </Link>

      <div className="mt-6 mb-10">
        <Eyebrow>{doc.eyebrow}</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight mb-4">
          {doc.title}
        </h1>
        <p className="text-mid text-sm leading-relaxed">{doc.summary}</p>
      </div>

      <div className="space-y-8">
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-3">
              {s.title}
            </h2>
            <p className="text-sm text-light/90 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 text-xs text-mid">
        Last reviewed: 02 May 2026. Owner: Navon Compliance Office.
      </p>
    </article>
  );
}

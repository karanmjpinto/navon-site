export const metadata = { title: "Portal Guide — Navon" };

const features = [
  {
    icon: "⬛",
    title: "Dashboard",
    href: "/dashboard",
    summary: "Your command centre.",
    detail:
      "See live power draw, active tickets, recent billing activity, and site health at a glance. Numbers update automatically — no refresh needed.",
  },
  {
    icon: "🏢",
    title: "Sites & Infrastructure",
    href: "/sites",
    summary: "Everything inside your data centre space.",
    detail:
      "Browse your cabinets, the devices mounted in each rack, and the cross-connects linking you to other networks. Use this to confirm what gear you have deployed and where it sits.",
  },
  {
    icon: "🌐",
    title: "Network",
    href: "/network",
    summary: "IP addresses, VLANs, and prefixes.",
    detail:
      "View all the IP space and VLANs assigned to your organisation. If you need a new prefix or have a routing question, raise a ticket and reference the details here.",
  },
  {
    icon: "⚡",
    title: "Capacity",
    href: "/capacity",
    summary: "Power consumption and headroom.",
    detail:
      "Track how much power your footprint is drawing versus your contracted allocation. A forecast graph shows your trend so you can plan upgrades before you hit limits.",
  },
  {
    icon: "🎫",
    title: "Tickets",
    href: "/tickets",
    summary: "Raise and track support requests.",
    detail:
      "Open a ticket for any operational issue — hardware faults, cross-connect requests, access requests, or general queries. Each ticket shows its SLA countdown and all engineer updates in one thread.",
  },
  {
    icon: "💳",
    title: "Billing",
    href: "/billing",
    summary: "Invoices, payments, and M-Pesa.",
    detail:
      "Download invoices, view payment history, and pay outstanding balances directly via M-Pesa. If a charge looks wrong, open a billing ticket from this page.",
  },
  {
    icon: "📊",
    title: "Reports",
    href: "/reports",
    summary: "Usage and uptime history.",
    detail:
      "Export power, network, and uptime data for any date range. Useful for internal reporting or capacity planning conversations with your team.",
  },
  {
    icon: "🔔",
    title: "Notifications",
    href: "/notifications",
    summary: "Alerts and announcements.",
    detail:
      "Receive alerts when a ticket is updated, a payment is due, or the ops team posts a maintenance window. The bell icon in the top bar shows your unread count.",
  },
  {
    icon: "💬",
    title: "Feedback",
    href: "/feedback",
    summary: "Tell us what's working and what isn't.",
    detail:
      "Submit feedback directly to the Navon team. You can also use the floating button at the bottom-right of any page to send a quick note without leaving what you're doing.",
  },
  {
    icon: "⚙️",
    title: "Settings",
    href: "/settings",
    summary: "Account, team, and API access.",
    detail:
      "Manage your profile, invite team members, set their roles, and generate API tokens for programmatic access. SAML SSO configuration is also handled here.",
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Beta banner */}
      <div className="border border-signal/40 bg-signal/5 px-5 py-4 flex gap-3 items-start">
        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 bg-signal" aria-hidden />
        <div>
          <p className="text-sm font-mono text-signal uppercase tracking-wider mb-1">
            Beta — things will change
          </p>
          <p className="text-sm text-mid leading-relaxed">
            The Navon customer portal is in active development. Features, layouts,
            and URLs may shift without notice. If something breaks or a page looks
            wrong, use the{" "}
            <a href="/feedback" className="text-paper underline underline-offset-2">
              Feedback
            </a>{" "}
            page or the floating button at the bottom-right. We read everything.
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-paper mb-2">Portal guide</h1>
        <p className="text-mid leading-relaxed max-w-2xl">
          Everything you can do inside the Navon portal, explained plainly. Click
          any section heading to go straight there.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {features.map((f) => (
          <div
            key={f.href}
            className="border border-charcoal bg-ink p-5 space-y-2 hover:border-slate transition-colors duration-150"
          >
            <a
              href={f.href}
              className="flex items-center gap-2 group"
            >
              <span className="text-base">{f.icon}</span>
              <span className="font-mono text-xs uppercase tracking-wider text-signal group-hover:text-paper transition-colors duration-150">
                {f.title}
              </span>
              <span className="text-charcoal text-xs">↗</span>
            </a>
            <p className="text-sm text-paper font-medium">{f.summary}</p>
            <p className="text-sm text-mid leading-relaxed">{f.detail}</p>
          </div>
        ))}
      </div>

      {/* Help footer */}
      <div className="border-t border-charcoal pt-8 text-sm text-mid space-y-1">
        <p>
          Can&apos;t find what you need?{" "}
          <a href="/tickets" className="text-paper underline underline-offset-2">
            Open a ticket
          </a>{" "}
          and the Navon ops team will respond within your SLA window.
        </p>
        <p>
          For technical documentation, visit{" "}
          <a
            href="https://navonworld.com/docs"
            className="text-paper underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            navonworld.com/docs ↗
          </a>
          .
        </p>
      </div>
    </div>
  );
}

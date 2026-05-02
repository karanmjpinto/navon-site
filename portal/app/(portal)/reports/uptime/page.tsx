import Link from "next/link";
import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "@/db";
import { alertEvents, maintenanceWindows, alertRules } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { Empty, Eyebrow, Chip } from "@/components/forms";
import { datetime, relativeTime } from "@/lib/format";

const TARGETS = {
  power: 99.99,
  network: 99.95,
  platform: 99.9,
} as const;

export default async function UptimeReport({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.max(1, Math.min(365, Number(sp.days) || 30));
  const since = new Date(Date.now() - days * 24 * 3600_000);
  const { orgId } = await requireSession();

  const alerts = await db
    .select({
      id: alertEvents.id,
      observedValue: alertEvents.observedValue,
      startedAt: alertEvents.startedAt,
      endedAt: alertEvents.endedAt,
      ruleName: alertRules.name,
      metric: alertRules.metric,
    })
    .from(alertEvents)
    .leftJoin(alertRules, eq(alertRules.id, alertEvents.ruleId))
    .where(
      and(
        eq(alertEvents.orgId, orgId),
        gte(alertEvents.startedAt, since),
      ),
    )
    .orderBy(desc(alertEvents.startedAt));

  const windows = await db
    .select()
    .from(maintenanceWindows)
    .where(
      and(
        eq(maintenanceWindows.orgId, orgId),
        gte(maintenanceWindows.startsAt, since),
      ),
    )
    .orderBy(desc(maintenanceWindows.startsAt));

  const plannedHours = windows.reduce(
    (acc, w) => acc + (w.endsAt.getTime() - w.startsAt.getTime()) / 3_600_000,
    0,
  );

  // Estimate unplanned downtime: each alert event treated as 5 minutes
  // until external probes provide real "endedAt" timestamps. Honest
  // proxy for v1 — flagged in the page copy below.
  const unplannedMinutes = alerts.length * 5;
  const totalMinutes = days * 24 * 60;
  const downtimeMinutes = unplannedMinutes; // exclude planned per industry convention
  const availability =
    totalMinutes === 0
      ? 100
      : ((totalMinutes - downtimeMinutes) / totalMinutes) * 100;

  return (
    <div className="max-w-4xl space-y-10">
      <Link
        href="/reports"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All reports
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <Eyebrow>Reporting</Eyebrow>
          <h1 className="text-3xl font-medium tracking-tight">
            Uptime & SLA
          </h1>
          <p className="text-mid text-sm mt-2 max-w-xl">
            Estimated availability based on alert events recorded by the
            portal. Real uptime is reconciled monthly against external probe
            data and the operator-reported incident log.
          </p>
        </div>
        <nav className="flex items-center gap-3 text-xs font-mono uppercase tracking-[0.18em]">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/reports/uptime?days=${d}`}
              className={`px-3 py-1.5 border ${
                d === days
                  ? "border-signal text-signal"
                  : "border-charcoal text-mid hover:border-paper hover:text-paper"
              } transition-colors`}
            >
              {d}d
            </Link>
          ))}
        </nav>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-charcoal border border-charcoal">
        <Stat label="Estimated availability" value={`${availability.toFixed(3)}%`} sub={`over the last ${days}d`} />
        <Stat
          label="Planned maintenance"
          value={`${plannedHours.toFixed(1)} h`}
          sub={`${windows.length} window${windows.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Alerts fired"
          value={String(alerts.length)}
          sub={alerts.length === 0 ? "—" : `last: ${relativeTime(alerts[0].startedAt)}`}
        />
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          SLA targets (per Master Services Agreement)
        </p>
        <div className="grid grid-cols-3 gap-px bg-charcoal border border-charcoal">
          <Stat label="Power" value={`${TARGETS.power}%`} sub="per cabinet inlet" />
          <Stat label="Network" value={`${TARGETS.network}%`} sub="committed transit" />
          <Stat label="Platform" value={`${TARGETS.platform}%`} sub="portal + APIs" />
        </div>
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Alert events
        </p>
        {alerts.length === 0 ? (
          <Empty>No alerts fired in this window.</Empty>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
                <th className="py-3 border-b border-charcoal">Rule</th>
                <th className="py-3 border-b border-charcoal">Metric</th>
                <th className="py-3 border-b border-charcoal">Observed</th>
                <th className="py-3 border-b border-charcoal text-right">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-charcoal">
                  <td className="py-3 pr-4 text-paper">{a.ruleName ?? "—"}</td>
                  <td className="py-3 pr-4 text-mid">{a.metric ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono">
                    {a.observedValue.toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-mid">
                    {datetime(a.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Maintenance windows in window
        </p>
        {windows.length === 0 ? (
          <Empty>No maintenance windows in this period.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {windows.map((w) => {
              const hours =
                (w.endsAt.getTime() - w.startsAt.getTime()) / 3_600_000;
              return (
                <div
                  key={w.id}
                  className="bg-ink-2 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm">{w.summary}</p>
                    <p className="text-xs text-mid mt-1">
                      {datetime(w.startsAt)} → {datetime(w.endsAt)}
                    </p>
                  </div>
                  <Chip tone="default">{hours.toFixed(1)} h</Chip>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-ink p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate mb-3">
        {label}
      </p>
      <p className="text-3xl font-medium tracking-tight mb-1">{value}</p>
      <p className="text-xs text-mid">{sub}</p>
    </div>
  );
}

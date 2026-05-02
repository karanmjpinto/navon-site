import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceWindows } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { Empty, Eyebrow, Chip } from "@/components/forms";
import { datetime } from "@/lib/format";

export default async function MaintenanceListPage() {
  const { orgId } = await requireSession();

  const all = await db
    .select()
    .from(maintenanceWindows)
    .where(eq(maintenanceWindows.orgId, orgId))
    .orderBy(desc(maintenanceWindows.startsAt))
    .limit(50);

  const now = new Date();
  const upcoming = all.filter((w) => w.endsAt >= now);
  const past = all.filter((w) => w.endsAt < now);

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <Eyebrow>Operations</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">
          Scheduled maintenance
        </h1>
        <p className="text-mid text-sm mt-2">
          Heads-up for upcoming changes that may affect your services. Admins
          schedule windows in{" "}
          <Link href="/settings/maintenance" className="text-paper underline underline-offset-4">
            Settings → Maintenance
          </Link>
          .
        </p>
      </div>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Upcoming
        </p>
        {upcoming.length === 0 ? (
          <Empty>No scheduled maintenance.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {upcoming.map((w) => {
              const active = w.startsAt <= now && now <= w.endsAt;
              return (
                <div key={w.id} className="bg-ink-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{w.summary}</p>
                    <Chip tone={active ? "signal" : "paper"}>
                      {active ? "Active now" : "Scheduled"}
                    </Chip>
                  </div>
                  <p className="text-xs text-mid mt-1">
                    {datetime(w.startsAt)} → {datetime(w.endsAt)} · scope:{" "}
                    {w.scope}
                  </p>
                  {w.body && (
                    <p className="text-xs text-mid mt-2 leading-relaxed">
                      {w.body}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Recent past
        </p>
        {past.length === 0 ? (
          <Empty>Nothing in the recent past.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {past.slice(0, 10).map((w) => (
              <div key={w.id} className="bg-ink-2 p-4">
                <p className="text-sm text-mid">{w.summary}</p>
                <p className="text-xs text-slate mt-1">
                  {datetime(w.startsAt)} → {datetime(w.endsAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceWindows } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import {
  Card,
  Field,
  TextArea,
  SelectField,
  PrimaryButton,
  Empty,
  Eyebrow,
  Chip,
} from "@/components/forms";
import { datetime } from "@/lib/format";
import { createMaintenance, deleteMaintenance } from "./actions";

function isoLocal(date: Date) {
  const tz = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 16);
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireSession();
  const m = await userMembership(ctx.userId, ctx.orgId);
  if (m?.role !== "admin") redirect("/settings");
  const sp = await searchParams;

  const windows = await db
    .select()
    .from(maintenanceWindows)
    .where(eq(maintenanceWindows.orgId, ctx.orgId))
    .orderBy(desc(maintenanceWindows.startsAt));

  const now = new Date();
  const future = windows.filter((w) => w.endsAt >= now);
  const past = windows.filter((w) => w.endsAt < now);

  const startDefault = new Date(Date.now() + 24 * 3600_000);
  const endDefault = new Date(startDefault.getTime() + 4 * 3600_000);

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <Eyebrow>Account</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">
          Maintenance windows
        </h1>
        <p className="text-mid text-sm mt-2 max-w-xl">
          Announce scheduled downtime to your team. A banner appears on the
          dashboard while the window is active or imminent (next 48h). All
          members receive an in-app notification and email.
        </p>
      </div>

      <Card title="Schedule maintenance">
        <form action={createMaintenance} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Summary" name="summary" required />
          </div>
          <div className="col-span-2">
            <TextArea label="Details (optional)" name="body" rows={3} />
          </div>
          <SelectField
            label="Scope"
            name="scope"
            defaultValue="org"
            options={[
              { value: "org", label: "Whole organisation" },
              { value: "site", label: "Specific site (paste site ID)" },
              { value: "cabinet", label: "Specific cabinet (paste cabinet ID)" },
            ]}
          />
          <Field label="Target ID (if site/cabinet)" name="targetId" />
          <Field
            label="Starts (local time)"
            name="startsAt"
            type="datetime-local"
            defaultValue={isoLocal(startDefault)}
            required
          />
          <Field
            label="Ends (local time)"
            name="endsAt"
            type="datetime-local"
            defaultValue={isoLocal(endDefault)}
            required
          />
          <div className="col-span-2 mt-2">
            <PrimaryButton>Schedule</PrimaryButton>
          </div>
          {sp.error && (
            <p className="col-span-2 text-xs text-signal">
              Couldn't save. Check the start/end times.
            </p>
          )}
        </form>
      </Card>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Upcoming & active
        </p>
        {future.length === 0 ? (
          <Empty>No upcoming maintenance.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {future.map((w) => {
              const active = w.startsAt <= now && now <= w.endsAt;
              return (
                <div
                  key={w.id}
                  className="bg-ink-2 p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{w.summary}</p>
                    <p className="text-xs text-mid mt-1">
                      {datetime(w.startsAt)} → {datetime(w.endsAt)}
                      {" · "}
                      {w.scope === "org" ? "whole org" : w.scope}
                    </p>
                    {w.body && (
                      <p className="text-xs text-mid mt-2 leading-relaxed">
                        {w.body}
                      </p>
                    )}
                  </div>
                  <Chip tone={active ? "signal" : "paper"}>
                    {active ? "Active" : "Scheduled"}
                  </Chip>
                  <form action={deleteMaintenance}>
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      className="text-xs text-mid hover:text-signal"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Past
        </p>
        {past.length === 0 ? (
          <Empty>No past maintenance windows.</Empty>
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

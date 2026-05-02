import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { alertRules, alertEvents } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import {
  Card,
  Field,
  SelectField,
  PrimaryButton,
  Empty,
  Eyebrow,
  Chip,
} from "@/components/forms";
import { datetime, relativeTime } from "@/lib/format";
import {
  createAlertRule,
  toggleAlertRule,
  deleteAlertRule,
} from "./actions";

const METRIC_LABEL = {
  power_kw: "Power (kW)",
  temp_c: "Temperature (°C)",
  bandwidth_gbps: "Bandwidth (Gbps)",
} as const;

const COMP_LABEL = { gt: "above", lt: "below" } as const;

export default async function AlertRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireSession();
  const m = await userMembership(ctx.userId, ctx.orgId);
  if (m?.role !== "admin") redirect("/settings");
  const sp = await searchParams;

  const rules = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.orgId, ctx.orgId))
    .orderBy(desc(alertRules.createdAt));

  const recent = await db
    .select()
    .from(alertEvents)
    .where(eq(alertEvents.orgId, ctx.orgId))
    .orderBy(desc(alertEvents.startedAt))
    .limit(10);

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <Eyebrow>Account</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">Alert rules</h1>
        <p className="text-mid text-sm mt-2 max-w-xl">
          Threshold-based rules. Evaluated on every metrics ingest. When a
          breach is sustained for the configured window, the rule fires once,
          then suppresses for an hour to avoid noise.
        </p>
      </div>

      <Card title="Create a rule">
        <form action={createAlertRule} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Name" name="name" placeholder="A12 power over 7 kW" required />
          </div>
          <SelectField
            label="Metric"
            name="metric"
            defaultValue="power_kw"
            options={[
              { value: "power_kw", label: "Power (kW)" },
              { value: "temp_c", label: "Temperature (°C)" },
              { value: "bandwidth_gbps", label: "Bandwidth (Gbps)" },
            ]}
          />
          <SelectField
            label="Comparison"
            name="comparison"
            defaultValue="gt"
            options={[
              { value: "gt", label: "Greater than" },
              { value: "lt", label: "Less than" },
            ]}
          />
          <Field label="Threshold" name="threshold" type="number" required />
          <Field
            label="Sustained for (min)"
            name="sustainedMinutes"
            type="number"
            defaultValue={5}
            required
          />
          <label className="col-span-2 flex items-center gap-3 text-sm">
            <input type="checkbox" name="notifyEmail" defaultChecked />
            <span>Send email to all admins when triggered</span>
          </label>
          <div className="col-span-2 mt-2">
            <PrimaryButton>Create rule</PrimaryButton>
          </div>
          {sp.error && (
            <p className="col-span-2 text-xs text-signal">
              Couldn't save the rule. Check the values.
            </p>
          )}
        </form>
      </Card>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Active rules
        </p>
        {rules.length === 0 ? (
          <Empty>No rules yet.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {rules.map((r) => (
              <div
                key={r.id}
                className="bg-ink-2 p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.name}</p>
                  <p className="text-xs text-mid mt-1">
                    {METRIC_LABEL[r.metric]} {COMP_LABEL[r.comparison]}{" "}
                    <span className="text-paper font-mono">{r.threshold}</span>{" "}
                    for ≥ {r.sustainedMinutes} min
                    {r.notifyEmail ? " · email admins" : ""}
                  </p>
                  {r.lastTriggeredAt && (
                    <p className="text-xs text-signal mt-1">
                      Last fired {relativeTime(r.lastTriggeredAt)}
                    </p>
                  )}
                </div>
                <Chip tone={r.enabled ? "signal" : "muted"}>
                  {r.enabled ? "Enabled" : "Disabled"}
                </Chip>
                <form action={toggleAlertRule}>
                  <input type="hidden" name="id" value={r.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={String(r.enabled)}
                  />
                  <button
                    type="submit"
                    className="text-xs text-mid hover:text-paper"
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </button>
                </form>
                <form action={deleteAlertRule}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="text-xs text-mid hover:text-signal"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Recent events
        </p>
        {recent.length === 0 ? (
          <Empty>No alerts have fired recently.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {recent.map((e) => (
              <div key={e.id} className="bg-ink-2 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    Observed{" "}
                    <span className="font-mono">
                      {e.observedValue.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-mid mt-1">
                    started {datetime(e.startedAt)}
                  </p>
                </div>
                <Chip tone="paper">Fired</Chip>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

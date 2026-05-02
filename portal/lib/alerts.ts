import { eq, and, gte, desc, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  alertRules,
  alertEvents,
  metricsSeed,
  notifications,
  users,
  memberships,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";

const METRIC_LABEL = {
  power_kw: "Power draw (kW)",
  temp_c: "Inlet temperature (°C)",
  bandwidth_gbps: "Bandwidth (Gbps)",
} as const;

type Metric = keyof typeof METRIC_LABEL;

// Run every enabled rule for an org against the most-recent
// `sustainedMinutes` of points. Fire when *all* points in that window
// breach the threshold and the rule wasn't fired in the last hour.
//
// Called from POST /api/metrics so latency follows ingestion. Safe to
// also run on a cron later — it's idempotent within the suppression
// window.
export async function evaluateAlertsForOrg(orgId: string): Promise<number> {
  const rules = await db
    .select()
    .from(alertRules)
    .where(and(eq(alertRules.orgId, orgId), eq(alertRules.enabled, true)));
  if (rules.length === 0) return 0;

  const now = new Date();
  let fired = 0;

  for (const rule of rules) {
    if (
      rule.lastTriggeredAt &&
      now.getTime() - rule.lastTriggeredAt.getTime() < 60 * 60_000
    ) {
      continue; // suppression window
    }
    const since = new Date(now.getTime() - rule.sustainedMinutes * 60_000);
    const points = await db
      .select()
      .from(metricsSeed)
      .where(and(eq(metricsSeed.orgId, orgId), gte(metricsSeed.ts, since)))
      .orderBy(desc(metricsSeed.ts));
    if (points.length === 0) continue;

    const value = (p: typeof points[number]): number => {
      const m = rule.metric as Metric;
      if (m === "power_kw") return p.powerKw;
      if (m === "temp_c") return p.tempC;
      return p.bandwidthGbps;
    };
    const breach = (v: number) =>
      rule.comparison === "gt" ? v > rule.threshold : v < rule.threshold;
    const allBreach = points.every((p) => breach(value(p)));
    if (!allBreach) continue;

    const observed = value(points[0]);

    await db.insert(alertEvents).values({
      orgId,
      ruleId: rule.id,
      observedValue: observed,
      startedAt: points.at(-1)!.ts,
    });
    await db
      .update(alertRules)
      .set({ lastTriggeredAt: now })
      .where(eq(alertRules.id, rule.id));

    // Notify all admins of this org.
    const admins = await db
      .select({
        userId: memberships.userId,
        email: users.email,
        name: users.name,
      })
      .from(memberships)
      .leftJoin(users, eq(users.id, memberships.userId))
      .where(
        and(eq(memberships.orgId, orgId), eq(memberships.role, "admin")),
      );

    const subject = `Alert: ${rule.name}`;
    const body =
      `${METRIC_LABEL[rule.metric as Metric]} is ` +
      `${rule.comparison === "gt" ? "above" : "below"} ${rule.threshold} ` +
      `for ≥ ${rule.sustainedMinutes} min. Last reading: ${observed.toFixed(2)}.`;

    if (admins.length > 0) {
      await db.insert(notifications).values(
        admins.map((a) => ({
          orgId,
          userId: a.userId,
          kind: "alert" as const,
          subject,
          body,
          link: "/notifications",
        })),
      );
      if (rule.notifyEmail) {
        const recipients = admins
          .map((a) => a.email)
          .filter((e): e is string => !!e);
        if (recipients.length > 0) {
          await sendEmail({
            to: recipients,
            subject,
            text: `${body}\n\nView the dashboard: ${process.env.AUTH_URL ?? "http://localhost:3002"}/dashboard`,
          });
        }
      }
    }
    fired++;
  }
  return fired;
}

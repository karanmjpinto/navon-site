import { redirect } from "next/navigation";
import { eq, desc, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents, users } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import { datetime } from "@/lib/format";
import { Eyebrow, Empty } from "@/components/forms";

const ACTION_LABEL: Record<string, string> = {
  "ticket.create": "Ticket created",
  "ticket.comment": "Ticket comment",
  "ticket.status": "Ticket status changed",
  "site.create": "Site added",
  "cabinet.create": "Cabinet added",
  "device.create": "Device added",
  "device.delete": "Device removed",
  "cross_connect.create": "Cross-connect requested",
  "invoice.download": "Invoice downloaded",
  "invite.create": "Invite sent",
  "invite.revoke": "Invite revoked",
  "membership.role_change": "Role changed",
  "membership.remove": "Member removed",
  "profile.update": "Profile updated",
  "password.change": "Password changed",
  "mfa.enable": "2FA enabled",
  "mfa.disable": "2FA disabled",
  "metrics_token.create": "Ingestion token created",
  "metrics_token.revoke": "Ingestion token revoked",
  "mpesa.initiate": "M-Pesa payment initiated",
};

export default async function ActivityPage() {
  const ctx = await requireSession();
  const m = await userMembership(ctx.userId, ctx.orgId);
  if (m?.role !== "admin") redirect("/settings");

  const rows = await withOrgContext(ctx.orgId, () =>
    db
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        targetType: auditEvents.targetType,
        targetId: auditEvents.targetId,
        ip: auditEvents.ip,
        userAgent: auditEvents.userAgent,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.userId))
      .where(or(eq(auditEvents.orgId, ctx.orgId), isNull(auditEvents.orgId)))
      .orderBy(desc(auditEvents.createdAt))
      .limit(200),
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Eyebrow>Account</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">Activity</h1>
        <p className="text-mid text-sm mt-2">
          Append-only audit log of administrative and tenant events. Used for
          security review and ISO 27001 / SOC 2 evidence.
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty>No events yet.</Empty>
      ) : (
        <div className="border border-charcoal divide-y divide-charcoal">
          {rows.map((e) => (
            <div key={e.id} className="bg-ink-2 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {ACTION_LABEL[e.action] ?? e.action}
                    {e.metadata ? (
                      <span className="text-mid font-mono text-xs ml-2">
                        {JSON.stringify(e.metadata)}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-mid mt-1">
                    by{" "}
                    <span className="text-paper">
                      {e.actorName ?? e.actorEmail ?? "—"}
                    </span>
                    {e.ip && <> · {e.ip}</>}
                    {e.targetType && (
                      <> · {e.targetType}
                        {e.targetId && (
                          <span className="font-mono text-[11px] text-mid">
                            {" "}
                            ({e.targetId.slice(0, 8)})
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-mid whitespace-nowrap">
                  {datetime(e.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

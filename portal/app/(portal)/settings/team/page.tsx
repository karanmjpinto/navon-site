import { redirect } from "next/navigation";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users, invites } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
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
import { datetime } from "@/lib/format";
import {
  inviteMember,
  revokeInvite,
  changeRole,
  removeMember,
} from "./actions";

const ROLE_LABEL = {
  admin: "Admin",
  technical: "Technical",
  finance: "Finance",
} as const;

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireSession();
  const m = await userMembership(ctx.userId, ctx.orgId);
  if (m?.role !== "admin") redirect("/settings");
  const sp = await searchParams;

  const data = await withOrgContext(ctx.orgId, async () => {
    const members = await db
      .select({
        userId: memberships.userId,
        role: memberships.role,
        name: users.name,
        email: users.email,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .leftJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.orgId, ctx.orgId))
      .orderBy(asc(users.email));

    const pending = await db
      .select()
      .from(invites)
      .where(
        and(eq(invites.orgId, ctx.orgId), isNull(invites.acceptedAt)),
      )
      .orderBy(asc(invites.createdAt));
    return { members, pending };
  });

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <Eyebrow>Account</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">Team</h1>
      </div>

      {sp.error === "last_admin" && (
        <p className="text-sm text-signal">
          You're the only admin — promote someone else first.
        </p>
      )}
      {sp.error === "self_remove" && (
        <p className="text-sm text-signal">
          You can't remove yourself. Have another admin do it.
        </p>
      )}

      {/* Members ─────────────────────────────────────────────── */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Members
        </p>
        <div className="border border-charcoal divide-y divide-charcoal">
          {data.members.map((u) => (
            <div
              key={u.userId}
              className="flex items-center justify-between p-4 bg-ink-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {u.name ?? <span className="text-mid">Unnamed</span>}
                  {u.userId === ctx.userId && (
                    <span className="ml-2 text-xs text-mid">(you)</span>
                  )}
                </p>
                <p className="text-xs text-mid">{u.email}</p>
              </div>
              <form action={changeRole} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={u.userId} />
                <select
                  name="role"
                  defaultValue={u.role}
                  className="bg-ink border border-charcoal text-paper px-2 py-1 text-xs focus:outline-none focus:border-signal"
                >
                  {(Object.keys(ROLE_LABEL) as Array<keyof typeof ROLE_LABEL>).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-xs text-mid hover:text-paper"
                >
                  Update
                </button>
              </form>
              {u.userId !== ctx.userId && (
                <form action={removeMember} className="ml-3">
                  <input type="hidden" name="userId" value={u.userId} />
                  <button
                    type="submit"
                    className="text-xs text-mid hover:text-signal"
                  >
                    Remove
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Invite ──────────────────────────────────────────────── */}
      <Card title="Invite a teammate">
        <form action={inviteMember} className="grid grid-cols-2 gap-4">
          <Field label="Work email" name="email" type="email" required />
          <SelectField
            label="Role"
            name="role"
            defaultValue="technical"
            options={[
              { value: "admin", label: "Admin" },
              { value: "technical", label: "Technical" },
              { value: "finance", label: "Finance" },
            ]}
          />
          <div className="col-span-2">
            <PrimaryButton>Send invite</PrimaryButton>
          </div>
          {sp.error === "invalid" && (
            <p className="col-span-2 text-xs text-signal">
              Email or role looks wrong.
            </p>
          )}
        </form>
      </Card>

      {/* Pending invites ─────────────────────────────────────── */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Pending invites
        </p>
        {data.pending.length === 0 ? (
          <Empty>No pending invites.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {data.pending.map((i) => (
              <div
                key={i.id}
                className="p-4 bg-ink-2 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{i.email}</p>
                  <p className="text-xs text-mid">
                    {ROLE_LABEL[i.role]} · expires {datetime(i.expiresAt)}
                  </p>
                  <p className="text-[11px] font-mono text-mid mt-1 break-all">
                    Link: <span className="text-paper">/accept-invite?token={i.token}</span>
                  </p>
                </div>
                <Chip tone="default">Pending</Chip>
                <form action={revokeInvite} className="ml-3">
                  <input type="hidden" name="id" value={i.id} />
                  <button
                    type="submit"
                    className="text-xs text-mid hover:text-signal"
                  >
                    Revoke
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-mid">
          Invitee must already have an account with the matching email, then
          visit the link above. Email delivery via Resend is wired in Phase 2.
        </p>
      </section>
    </div>
  );
}

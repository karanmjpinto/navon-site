import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { metricsTokens } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import {
  Card,
  Field,
  PrimaryButton,
  Empty,
  Eyebrow,
  Chip,
} from "@/components/forms";
import { datetime, relativeTime } from "@/lib/format";
import { createToken, revokeToken } from "./actions";

const NEW_TOKEN_COOKIE = "navon_new_token";

export default async function ApiTokensPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const ctx = await requireSession();
  const m = await userMembership(ctx.userId, ctx.orgId);
  if (m?.role !== "admin") redirect("/settings");
  const sp = await searchParams;

  const tokens = await db
    .select()
    .from(metricsTokens)
    .where(eq(metricsTokens.orgId, ctx.orgId))
    .orderBy(desc(metricsTokens.createdAt));

  const c = await cookies();
  const justCreated = sp.created === "1" ? c.get(NEW_TOKEN_COOKIE)?.value : null;
  if (justCreated) {
    // Read-once. Delete the cookie so a refresh hides the secret.
    c.delete(NEW_TOKEN_COOKIE);
  }

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <Eyebrow>Account</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">
          Metrics ingestion API
        </h1>
        <p className="text-mid text-sm mt-2 max-w-xl">
          Bearer tokens used by your DCIM/BMS systems to POST telemetry into
          your dashboard. Each token is shown once at creation; if you lose it,
          revoke and create a new one.
        </p>
      </div>

      {justCreated && (
        <Card title="New token (shown once)">
          <p className="text-xs text-mid mb-3">
            Copy this and store it in your secret manager now. We only keep the
            hash — we cannot show it again.
          </p>
          <code className="block bg-ink p-3 border border-charcoal font-mono text-sm break-all text-signal">
            {justCreated}
          </code>
          <p className="text-xs text-mid mt-4">
            Test it locally:
          </p>
          <pre className="bg-ink p-3 border border-charcoal font-mono text-[11px] mt-2 overflow-x-auto whitespace-pre">
{`curl -X POST http://localhost:3002/api/metrics \\
  -H "Authorization: Bearer ${justCreated}" \\
  -H "Content-Type: application/json" \\
  -d '{"points":[{"ts":"${new Date().toISOString()}","powerKw":15.2,"powerKwh":1234.5,"tempC":22.4,"bandwidthGbps":0.81}]}'`}
          </pre>
        </Card>
      )}

      <Card title="Create a token">
        <form action={createToken} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field
              label="Name (eg. 'A12 PDU collector')"
              name="name"
              required
            />
          </div>
          <div className="col-span-2">
            <PrimaryButton>Generate token</PrimaryButton>
          </div>
        </form>
      </Card>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Existing tokens
        </p>
        {tokens.length === 0 ? (
          <Empty>No tokens yet.</Empty>
        ) : (
          <div className="border border-charcoal divide-y divide-charcoal">
            {tokens.map((t) => (
              <div
                key={t.id}
                className="bg-ink-2 p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{t.name}</p>
                  <p className="font-mono text-[11px] text-mid mt-1">
                    {t.tokenPrefix}…
                  </p>
                  <p className="text-xs text-mid mt-1">
                    created {datetime(t.createdAt)}
                    {t.lastUsedAt && (
                      <> · last used {relativeTime(t.lastUsedAt)}</>
                    )}
                  </p>
                </div>
                {t.revokedAt ? (
                  <Chip tone="muted">Revoked</Chip>
                ) : (
                  <>
                    <Chip tone="signal">Active</Chip>
                    <form action={revokeToken}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="text-xs text-mid hover:text-signal"
                      >
                        Revoke
                      </button>
                    </form>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

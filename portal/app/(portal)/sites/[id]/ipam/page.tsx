import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, asc, sql } from "drizzle-orm";
import { sites, ipRanges, ipAssignments } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import {
  Card,
  Field,
  PrimaryButton,
  Empty,
  Eyebrow,
} from "@/components/forms";
import { cidrSize } from "@/lib/ip";
import { createRange } from "./actions";

export default async function IpamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { orgId, userId } = await requireSession();
  const m = await userMembership(userId, orgId);
  const canEdit = m?.role === "admin" || m?.role === "technical";

  const data = await withOrgContext(orgId, async (tx) => {
    const [s] = await tx
      .select()
      .from(sites)
      .where(and(eq(sites.id, id), eq(sites.orgId, orgId)))
      .limit(1);
    if (!s) return null;
    const ranges = await tx
      .select()
      .from(ipRanges)
      .where(eq(ipRanges.siteId, id))
      .orderBy(asc(ipRanges.cidr));
    const counts = await tx
      .select({
        rangeId: ipAssignments.rangeId,
        count: sql<number>`count(*)::int`,
      })
      .from(ipAssignments)
      .groupBy(ipAssignments.rangeId);
    return {
      site: s,
      ranges: ranges.map((r) => ({
        ...r,
        used: counts.find((c) => c.rangeId === r.id)?.count ?? 0,
      })),
    };
  });

  if (!data) notFound();

  return (
    <div className="max-w-4xl space-y-12">
      <Link
        href={`/sites/${data.site.id}`}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← {data.site.name}
      </Link>

      <div>
        <Eyebrow>IPAM</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">IP address management</h1>
        <p className="text-mid text-sm mt-2 max-w-xl">
          Track CIDR ranges per VLAN and assign individual addresses to
          devices. New devices typed up here flow back into the cabinet view.
        </p>
      </div>

      {data.ranges.length === 0 ? (
        <Empty>
          {canEdit
            ? "No ranges yet. Add the first one below."
            : "No ranges yet."}
        </Empty>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
              <th className="py-3 border-b border-charcoal">CIDR</th>
              <th className="py-3 border-b border-charcoal">VLAN</th>
              <th className="py-3 border-b border-charcoal">Gateway</th>
              <th className="py-3 border-b border-charcoal">Description</th>
              <th className="py-3 border-b border-charcoal text-right">
                Utilisation
              </th>
            </tr>
          </thead>
          <tbody>
            {data.ranges.map((r) => {
              const total = cidrSize(r.cidr);
              return (
                <tr
                  key={r.id}
                  className="border-b border-charcoal hover:bg-ink-2 transition-colors"
                >
                  <td className="py-3 pr-4 font-mono">
                    <Link
                      href={`/sites/${data.site.id}/ipam/${r.id}`}
                      className="hover:text-signal"
                    >
                      {r.cidr}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-mid font-mono">
                    {r.vlanId ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-mid font-mono">
                    {r.gateway ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-mid">{r.description ?? "—"}</td>
                  <td className="py-3 text-right text-mid">
                    {r.used} / {total}
                    <span className="ml-2 text-xs text-slate">
                      ({((r.used / total) * 100).toFixed(0)}%)
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {canEdit && (
        <Card title="Add a range">
          <form action={createRange} className="grid grid-cols-2 gap-4">
            <input type="hidden" name="siteId" value={data.site.id} />
            <Field label="CIDR (IPv4)" name="cidr" placeholder="10.20.0.0/24" required />
            <Field label="VLAN ID" name="vlanId" type="number" />
            <Field label="Gateway" name="gateway" placeholder="10.20.0.1" />
            <Field label="Description" name="description" />
            <div className="col-span-2">
              <PrimaryButton>Add range</PrimaryButton>
            </div>
            {sp.error && (
              <p className="col-span-2 text-xs text-signal">
                Range looks invalid. CIDR must be valid IPv4 (eg. 10.20.0.0/24).
              </p>
            )}
          </form>
        </Card>
      )}
    </div>
  );
}

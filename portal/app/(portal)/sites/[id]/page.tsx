import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { sites, cabinets } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import {
  Card,
  Field,
  SelectField,
  PrimaryButton,
  Empty,
  Eyebrow,
} from "@/components/forms";
import { createCabinet } from "../actions";

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function SiteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId, userId } = await requireSession();
  const membership = await userMembership(userId, orgId);
  const canEdit =
    membership?.role === "admin" || membership?.role === "technical";

  const data = await withOrgContext(orgId, async (tx) => {
    const [s] = await tx
      .select()
      .from(sites)
      .where(and(eq(sites.id, id), eq(sites.orgId, orgId)))
      .limit(1);
    if (!s) return null;
    const cabs = await tx
      .select()
      .from(cabinets)
      .where(eq(cabinets.siteId, id))
      .orderBy(asc(cabinets.label));
    return { site: s, cabinets: cabs };
  });

  if (!data) notFound();

  return (
    <div className="max-w-5xl space-y-12">
      <Link
        href="/sites"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All sites
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <Eyebrow>{data.site.code} · {data.site.country}</Eyebrow>
          <h1 className="text-3xl font-medium tracking-tight mb-2">
            {data.site.name}
          </h1>
          {data.site.address && (
            <p className="text-mid text-sm">{data.site.address}</p>
          )}
          {data.site.externalId && (
            <p className="mt-1 text-[10px] font-mono text-slate">
              from NetBox{data.site.lastSyncedAt ? ` · ${relativeTime(data.site.lastSyncedAt)}` : ""}
            </p>
          )}
        </div>
        <Link
          href={`/sites/${data.site.id}/ipam`}
          className="text-[13px] tracking-wide px-4 py-2.5 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
        >
          IPAM →
        </Link>
      </div>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Cabinets
        </p>
        {data.cabinets.length === 0 ? (
          <Empty>
            {canEdit
              ? "No cabinets yet. Add one below."
              : "No cabinets yet."}
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-charcoal border border-charcoal">
            {data.cabinets.map((c) => (
              <Link
                key={c.id}
                href={`/cabinets/${c.id}`}
                className="bg-ink p-5 hover:bg-ink-2 transition-colors duration-100 group"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-2">
                  Cabinet
                </p>
                <h3 className="text-2xl font-medium tracking-tight mb-3 group-hover:text-signal transition-colors">
                  {c.label}
                </h3>
                <p className="text-xs text-mid">
                  {c.rackUnits}U · {c.powerCapKw} kW · {c.status}
                </p>
                {c.externalId && (
                  <p className="mt-2 text-[10px] font-mono text-slate">
                    from NetBox ·{" "}
                    {c.lastSyncedAt ? relativeTime(c.lastSyncedAt) : "synced"}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <Card title="Add a cabinet">
          <form action={createCabinet} className="grid grid-cols-2 gap-4">
            <input type="hidden" name="siteId" value={data.site.id} />
            <Field label="Label" name="label" placeholder="A12" required />
            <Field
              label="Rack units"
              name="rackUnits"
              type="number"
              defaultValue={47}
              required
            />
            <Field
              label="Power cap (kW)"
              name="powerCapKw"
              type="number"
              defaultValue={6}
              required
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue="active"
              options={[
                { value: "active", label: "Active" },
                { value: "decommissioned", label: "Decommissioned" },
              ]}
            />
            <div className="col-span-2 mt-2">
              <PrimaryButton>Add cabinet</PrimaryButton>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

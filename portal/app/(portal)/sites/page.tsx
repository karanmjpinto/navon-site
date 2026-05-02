import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { sites, cabinets } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import { PageTitle, Card, Field, PrimaryButton, Empty } from "@/components/forms";
import { createSite } from "./actions";

export default async function SitesPage() {
  const { orgId, userId } = await requireSession();
  const membership = await userMembership(userId, orgId);
  const isAdmin = membership?.role === "admin";

  const rows = await withOrgContext(orgId, async (tx) => {
    const ss = await tx.select().from(sites).orderBy(asc(sites.name));
    const counts = await tx
      .select({
        siteId: cabinets.siteId,
        count: sql<number>`count(*)::int`,
      })
      .from(cabinets)
      .groupBy(cabinets.siteId);
    return ss.map((s) => ({
      ...s,
      cabinets: counts.find((c) => c.siteId === s.id)?.count ?? 0,
    }));
  });

  return (
    <div className="max-w-6xl space-y-12">
      <PageTitle
        eyebrow="Footprint"
        title="Sites"
        sub="Physical facilities you occupy. Drill into a site to see cabinets, devices, and cross-connects."
      />

      {rows.length === 0 ? (
        <Empty>
          {isAdmin
            ? "No sites yet. Add the first one below."
            : "No sites yet. Ask an admin to add one."}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-charcoal border border-charcoal">
          {rows.map((s) => (
            <Link
              key={s.id}
              href={`/sites/${s.id}`}
              className="bg-ink p-6 hover:bg-ink-2 transition-colors duration-100 group"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate mb-3">
                {s.code} · {s.country}
              </p>
              <h3 className="text-lg font-medium tracking-tight mb-2 group-hover:text-signal transition-colors">
                {s.name}
              </h3>
              <p className="text-sm text-mid">
                {s.cabinets} cabinet{s.cabinets === 1 ? "" : "s"}
                {s.address ? ` · ${s.address}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}

      {isAdmin && (
        <Card title="Add a site">
          <form action={createSite} className="grid grid-cols-2 gap-4">
            <Field label="Name" name="name" required />
            <Field label="Code" name="code" placeholder="HG-01" required />
            <div className="col-span-2">
              <Field label="Address" name="address" />
            </div>
            <Field label="Country (ISO-2)" name="country" defaultValue="KE" required />
            <div className="col-span-2 mt-2">
              <PrimaryButton>Create site</PrimaryButton>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import {
  ipRanges,
  ipAssignments,
  sites,
  devices,
  cabinets,
} from "@/db/schema";
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
import { cidrSize } from "@/lib/ip";
import {
  createAssignment,
  deleteAssignment,
} from "../actions";

const ERROR_LABELS: Record<string, string> = {
  address_outside_range: "That address isn't inside this range's CIDR.",
  range_not_found: "Range not found.",
};

export default async function RangeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; rangeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, rangeId } = await params;
  const sp = await searchParams;
  const { orgId, userId } = await requireSession();
  const m = await userMembership(userId, orgId);
  const canEdit = m?.role === "admin" || m?.role === "technical";

  const data = await withOrgContext(orgId, async (tx) => {
    const [r] = await tx
      .select()
      .from(ipRanges)
      .where(and(eq(ipRanges.id, rangeId), eq(ipRanges.orgId, orgId)))
      .limit(1);
    if (!r) return null;
    const [s] = await tx
      .select()
      .from(sites)
      .where(eq(sites.id, r.siteId))
      .limit(1);
    const assigns = await tx
      .select({
        id: ipAssignments.id,
        address: ipAssignments.address,
        label: ipAssignments.label,
        deviceId: ipAssignments.deviceId,
        createdAt: ipAssignments.createdAt,
        deviceLabel: devices.label,
        cabinetLabel: cabinets.label,
      })
      .from(ipAssignments)
      .leftJoin(devices, eq(devices.id, ipAssignments.deviceId))
      .leftJoin(cabinets, eq(cabinets.id, devices.cabinetId))
      .where(eq(ipAssignments.rangeId, rangeId))
      .orderBy(asc(ipAssignments.address));
    const cabs = await tx
      .select({ id: cabinets.id, label: cabinets.label })
      .from(cabinets)
      .where(eq(cabinets.siteId, r.siteId));
    const devs = await tx
      .select({
        id: devices.id,
        label: devices.label,
        cabinetId: devices.cabinetId,
      })
      .from(devices)
      .where(eq(devices.orgId, orgId));
    return { range: r, site: s, assignments: assigns, cabinets: cabs, devices: devs };
  });

  if (!data) notFound();
  const total = cidrSize(data.range.cidr);
  const used = data.assignments.length;

  return (
    <div className="max-w-4xl space-y-12">
      <Link
        href={`/sites/${id}/ipam`}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All ranges
      </Link>

      <div>
        <Eyebrow>IPAM range</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight font-mono">
          {data.range.cidr}
        </h1>
        <p className="text-mid text-sm mt-2">
          {data.range.description ?? "—"}
          {data.range.vlanId != null && <> · VLAN {data.range.vlanId}</>}
          {data.range.gateway && <> · gw {data.range.gateway}</>}
          {" · "}
          {used} / {total} used
        </p>
      </div>

      {sp.error && (
        <p className="text-xs text-signal">
          {ERROR_LABELS[sp.error] ?? `Could not save: ${sp.error}`}
        </p>
      )}

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Assignments
        </p>
        {data.assignments.length === 0 ? (
          <Empty>No addresses assigned yet.</Empty>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
                <th className="py-3 border-b border-charcoal">Address</th>
                <th className="py-3 border-b border-charcoal">Label</th>
                <th className="py-3 border-b border-charcoal">Bound to</th>
                {canEdit && <th className="py-3 border-b border-charcoal" />}
              </tr>
            </thead>
            <tbody>
              {data.assignments.map((a) => (
                <tr key={a.id} className="border-b border-charcoal">
                  <td className="py-3 pr-4 font-mono">{a.address}</td>
                  <td className="py-3 pr-4 text-mid">{a.label ?? "—"}</td>
                  <td className="py-3 pr-4 text-mid">
                    {a.deviceLabel
                      ? `${a.cabinetLabel ?? "?"} · ${a.deviceLabel}`
                      : "—"}
                  </td>
                  {canEdit && (
                    <td className="py-3 text-right">
                      <form action={deleteAssignment}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="rangeId" value={data.range.id} />
                        <input type="hidden" name="siteId" value={id} />
                        <button
                          type="submit"
                          className="text-xs text-mid hover:text-signal"
                        >
                          Release
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {canEdit && (
        <Card title="Allocate an address">
          <form action={createAssignment} className="grid grid-cols-2 gap-4">
            <input type="hidden" name="rangeId" value={data.range.id} />
            <Field label="Address (IPv4)" name="address" placeholder={data.range.cidr.split("/")[0].replace(/\.\d+$/, ".10")} required />
            <Field label="Label" name="label" placeholder="loopback / mgmt" />
            <SelectField
              label="Bind to device (optional)"
              name="deviceId"
              defaultValue=""
              options={[
                { value: "", label: "— none —" },
                ...data.devices.map((d) => ({
                  value: d.id,
                  label: `${data.cabinets.find((c) => c.id === d.cabinetId)?.label ?? "?"} · ${d.label}`,
                })),
              ]}
            />
            <div className="col-span-2 mt-2">
              <PrimaryButton>Allocate</PrimaryButton>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

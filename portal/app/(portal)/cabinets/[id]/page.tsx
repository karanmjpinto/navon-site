import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  cabinets,
  devices,
  crossConnects,
  sites,
} from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import {
  Card,
  Field,
  SelectField,
  PrimaryButton,
  Empty,
  Chip,
  Eyebrow,
} from "@/components/forms";
import {
  createDevice,
  createCrossConnect,
  deleteDevice,
} from "../../sites/actions";
import { date } from "@/lib/format";

export default async function CabinetDetail({
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
    const [c] = await tx
      .select()
      .from(cabinets)
      .where(and(eq(cabinets.id, id), eq(cabinets.orgId, orgId)))
      .limit(1);
    if (!c) return null;
    const [s] = await tx
      .select()
      .from(sites)
      .where(eq(sites.id, c.siteId))
      .limit(1);
    const devs = await tx
      .select()
      .from(devices)
      .where(eq(devices.cabinetId, id))
      .orderBy(asc(devices.rackUStart));
    const xcs = await tx
      .select()
      .from(crossConnects)
      .where(eq(crossConnects.fromCabinetId, id))
      .orderBy(desc(crossConnects.createdAt));
    return { cabinet: c, site: s, devices: devs, crossConnects: xcs };
  });

  if (!data) notFound();

  return (
    <div className="max-w-5xl space-y-12">
      <div>
        <Link
          href={`/sites/${data.site?.id ?? ""}`}
          className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
        >
          ← {data.site?.name ?? "Site"}
        </Link>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <Eyebrow>Cabinet</Eyebrow>
            <h1 className="text-3xl font-medium tracking-tight font-mono">
              {data.cabinet.label}
            </h1>
            <p className="text-mid text-sm mt-2">
              {data.cabinet.rackUnits}U · {data.cabinet.powerCapKw} kW cap ·{" "}
              {data.cabinet.status}
            </p>
          </div>
        </div>
      </div>

      {/* Devices ─────────────────────────────────────────────── */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Devices
        </p>
        {data.devices.length === 0 ? (
          <Empty>No devices yet.</Empty>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
                <th className="py-3 border-b border-charcoal">Label</th>
                <th className="py-3 border-b border-charcoal">Role</th>
                <th className="py-3 border-b border-charcoal">Vendor / model</th>
                <th className="py-3 border-b border-charcoal">Rack U</th>
                <th className="py-3 border-b border-charcoal">Serial</th>
                {canEdit && <th className="py-3 border-b border-charcoal" />}
              </tr>
            </thead>
            <tbody>
              {data.devices.map((d) => (
                <tr key={d.id} className="border-b border-charcoal">
                  <td className="py-3 pr-4 font-mono">{d.label}</td>
                  <td className="py-3 pr-4 text-mid capitalize">{d.role}</td>
                  <td className="py-3 pr-4 text-mid">
                    {[d.vendor, d.model].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-3 pr-4 text-mid">
                    {d.rackUStart
                      ? `U${d.rackUStart}${d.rackUSize > 1 ? `–U${d.rackUStart + d.rackUSize - 1}` : ""}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-mid">
                    {d.serial ?? "—"}
                  </td>
                  {canEdit && (
                    <td className="py-3 text-right">
                      <form action={deleteDevice}>
                        <input type="hidden" name="id" value={d.id} />
                        <input
                          type="hidden"
                          name="cabinetId"
                          value={data.cabinet.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-mid hover:text-signal transition-colors"
                        >
                          Remove
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
        <Card title="Add a device">
          <form action={createDevice} className="grid grid-cols-2 gap-4">
            <input type="hidden" name="cabinetId" value={data.cabinet.id} />
            <Field label="Label" name="label" placeholder="compute-03" required />
            <SelectField
              label="Role"
              name="role"
              defaultValue="compute"
              options={[
                { value: "compute", label: "Compute" },
                { value: "storage", label: "Storage" },
                { value: "network", label: "Network" },
                { value: "other", label: "Other" },
              ]}
            />
            <Field label="Vendor" name="vendor" />
            <Field label="Model" name="model" />
            <Field label="Serial" name="serial" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rack U start" name="rackUStart" type="number" />
              <Field label="Rack U size" name="rackUSize" type="number" defaultValue={1} />
            </div>
            <div className="col-span-2 mt-2">
              <PrimaryButton>Add device</PrimaryButton>
            </div>
          </form>
        </Card>
      )}

      {/* Cross-connects ──────────────────────────────────────── */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Cross-connects
        </p>
        {data.crossConnects.length === 0 ? (
          <Empty>No cross-connects yet.</Empty>
        ) : (
          <div className="space-y-px bg-charcoal border border-charcoal">
            {data.crossConnects.map((x) => (
              <div key={x.id} className="bg-ink p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    <span className="font-mono">{data.cabinet.label}</span>{" "}
                    <span className="text-mid">→</span> {x.toLabel}
                  </p>
                  <p className="text-xs text-mid mt-1">
                    {x.speedGbps} Gbps · {x.media.replace("_", "-")} ·{" "}
                    {x.provisionedAt
                      ? `provisioned ${date(x.provisionedAt)}`
                      : "pending"}
                  </p>
                </div>
                <Chip
                  tone={
                    x.status === "provisioned"
                      ? "signal"
                      : x.status === "pending"
                        ? "paper"
                        : "muted"
                  }
                >
                  {x.status}
                </Chip>
              </div>
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <Card title="Request a cross-connect">
          <form action={createCrossConnect} className="grid grid-cols-2 gap-4">
            <input
              type="hidden"
              name="fromCabinetId"
              value={data.cabinet.id}
            />
            <div className="col-span-2">
              <Field
                label="Destination"
                name="toLabel"
                placeholder="MMR rack 3, port 12"
                required
              />
            </div>
            <Field label="Speed (Gbps)" name="speedGbps" type="number" required />
            <SelectField
              label="Media"
              name="media"
              defaultValue="fiber_sm"
              options={[
                { value: "fiber_sm", label: "Single-mode fiber" },
                { value: "fiber_mm", label: "Multi-mode fiber" },
                { value: "copper", label: "Copper" },
              ]}
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue="pending"
              options={[
                { value: "pending", label: "Pending" },
                { value: "provisioned", label: "Provisioned" },
                { value: "decommissioned", label: "Decommissioned" },
              ]}
            />
            <div />
            <div className="col-span-2 mt-2">
              <PrimaryButton>Submit request</PrimaryButton>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

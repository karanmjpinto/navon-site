import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { crossConnects, cabinets, sites, users } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import { money, datetime } from "@/lib/format";
import {
  provisionCrossConnect,
  decommissionCrossConnect,
} from "../actions";
import {
  STATUS_CHIP,
  STATUS_LABEL,
  TYPE_LABEL,
  MEDIA_LABEL,
} from "../labels";

export default async function CrossConnectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSession();

  const xc = await withOrgContext(ctx.orgId, async (tx) => {
    const [row] = await tx
      .select({
        id: crossConnects.id,
        toLabel: crossConnects.toLabel,
        connectionType: crossConnects.connectionType,
        zSideProvider: crossConnects.zSideProvider,
        speedGbps: crossConnects.speedGbps,
        media: crossConnects.media,
        status: crossConnects.status,
        notes: crossConnects.notes,
        installFeeMinor: crossConnects.installFeeMinor,
        monthlyChargeMinor: crossConnects.monthlyChargeMinor,
        createdAt: crossConnects.createdAt,
        provisionedAt: crossConnects.provisionedAt,
        decommissionedAt: crossConnects.decommissionedAt,
        fromCabinetLabel: cabinets.label,
        siteName: sites.name,
        siteCode: sites.code,
        requesterName: users.name,
        requesterEmail: users.email,
      })
      .from(crossConnects)
      .leftJoin(cabinets, eq(crossConnects.fromCabinetId, cabinets.id))
      .leftJoin(sites, eq(cabinets.siteId, sites.id))
      .leftJoin(users, eq(crossConnects.requestedBy, users.id))
      .where(
        and(eq(crossConnects.id, id), eq(crossConnects.orgId, ctx.orgId)),
      )
      .limit(1);
    return row ?? null;
  });

  if (!xc) notFound();

  const membership = await userMembership(ctx.userId, ctx.orgId);
  const isAdmin = membership?.role === "admin";

  const aSide = `${xc.fromCabinetLabel ?? "—"}${xc.siteCode ? ` · ${xc.siteCode}` : ""}`;
  const zSide = xc.zSideProvider
    ? `${xc.zSideProvider} · ${xc.toLabel}`
    : xc.toLabel;

  return (
    <div className="max-w-3xl">
      <Link
        href="/cross-connects"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All cross-connects
      </Link>

      <div className="mt-6 mb-2 flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate">
          {TYPE_LABEL[xc.connectionType]} · {xc.speedGbps} Gbps
        </span>
        <span className="text-mid text-xs">·</span>
        <span
          className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] ${STATUS_CHIP[xc.status]}`}
        >
          {STATUS_LABEL[xc.status]}
        </span>
      </div>
      <h1 className="text-2xl font-medium tracking-tight mb-8">{zSide}</h1>

      {/* Connection facts */}
      <dl className="grid grid-cols-2 gap-px bg-charcoal border border-charcoal mb-8">
        <Fact label="A-side (your cabinet)" value={aSide} />
        <Fact label="Z-side demarcation" value={xc.toLabel} mono />
        <Fact label="Connection type" value={TYPE_LABEL[xc.connectionType]} />
        <Fact label="Media" value={MEDIA_LABEL[xc.media]} />
        <Fact label="Port speed" value={`${xc.speedGbps} Gbps`} mono />
        <Fact
          label="Requested by"
          value={xc.requesterName ?? xc.requesterEmail ?? "—"}
        />
      </dl>

      {/* Commercials */}
      <div className="border border-charcoal bg-ink-2 p-5 mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Commercials
        </p>
        <div className="flex gap-10">
          <div>
            <p className="text-xs text-mid">One-time install (NRC)</p>
            <p className="text-lg text-paper mt-1">
              {xc.installFeeMinor != null ? money(xc.installFeeMinor) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-mid">Monthly recurring (MRC)</p>
            <p className="text-lg text-paper mt-1">
              {xc.monthlyChargeMinor != null
                ? money(xc.monthlyChargeMinor)
                : "—"}
            </p>
          </div>
        </div>
        {xc.status === "pending" && (
          <p className="text-xs text-mid mt-4">
            Pricing is confirmed by the Navon team when the connect is
            provisioned.
          </p>
        )}
      </div>

      {xc.notes && (
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-2">
            Notes
          </p>
          <p className="text-sm text-light/90 whitespace-pre-wrap leading-relaxed">
            {xc.notes}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Provisioning timeline
        </p>
        <ul className="space-y-3">
          <TimelineRow
            done
            label="Requested"
            at={xc.createdAt}
          />
          <TimelineRow
            done={!!xc.provisionedAt}
            label="Provisioned — live"
            at={xc.provisionedAt}
            pending={xc.status === "pending"}
          />
          {xc.decommissionedAt && (
            <TimelineRow
              done
              label="Decommissioned"
              at={xc.decommissionedAt}
            />
          )}
        </ul>
      </div>

      {/* Admin controls */}
      {isAdmin && xc.status === "pending" && (
        <div className="border border-signal/40 bg-signal/5 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal mb-1">
            Admin · provision
          </p>
          <p className="text-xs text-mid mb-4">
            Confirm the physical patch is in place and set commercials. Amounts
            in KES.
          </p>
          <form
            action={provisionCrossConnect}
            className="flex flex-wrap items-end gap-4"
          >
            <input type="hidden" name="id" value={xc.id} />
            <MoneyInput label="Install fee (NRC)" name="installFee" />
            <MoneyInput label="Monthly (MRC)" name="monthlyCharge" />
            <button
              type="submit"
              className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-2.5 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
            >
              Mark provisioned
            </button>
          </form>
        </div>
      )}

      {isAdmin && xc.status === "provisioned" && (
        <div className="border border-charcoal p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-1">
            Admin
          </p>
          <p className="text-xs text-mid mb-4">
            Tearing down a connect stops billing and frees the port. This cannot
            be undone.
          </p>
          <form action={decommissionCrossConnect}>
            <input type="hidden" name="id" value={xc.id} />
            <button
              type="submit"
              className="text-[13px] tracking-wide px-4 py-2 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
            >
              Decommission
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-ink-2 px-5 py-4">
      <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
        {label}
      </dt>
      <dd className={`text-paper mt-1.5 ${mono ? "font-mono text-sm" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function TimelineRow({
  done,
  pending,
  label,
  at,
}: {
  done: boolean;
  pending?: boolean;
  label: string;
  at: Date | null;
}) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        className={`inline-block h-2 w-2 ${done ? "bg-signal" : "bg-charcoal"}`}
        aria-hidden
      />
      <span className={done ? "text-paper" : "text-mid"}>{label}</span>
      <span className="text-slate text-xs ml-auto">
        {at ? datetime(at) : pending ? "Awaiting Navon ops" : "—"}
      </span>
    </li>
  );
}

function MoneyInput({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <input
        name={name}
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        className="w-36 bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal"
      />
    </label>
  );
}

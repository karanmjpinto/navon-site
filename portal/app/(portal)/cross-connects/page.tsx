import Link from "next/link";
import { money, relativeTime } from "@/lib/format";
import { getCrossConnects } from "./actions";
import { STATUS_CHIP, STATUS_LABEL, TYPE_LABEL } from "./labels";

export default async function CrossConnectsPage() {
  const rows = await getCrossConnects();

  const live = rows.filter((r) => r.status === "provisioned");
  const pending = rows.filter((r) => r.status === "pending");
  const mrcTotal = live.reduce((sum, r) => sum + (r.monthlyChargeMinor ?? 0), 0);

  return (
    <div className="max-w-6xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
            Interconnection
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Cross-connects</h1>
          <p className="text-mid text-sm mt-2 max-w-xl">
            Dedicated physical links from your cabinets to clouds, carriers,
            peers, and the exchange — bypassing the public internet for lower
            latency and private, secure paths.
          </p>
        </div>
        <Link
          href="/cross-connects/new"
          className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px whitespace-nowrap"
        >
          Request cross-connect
        </Link>
      </div>

      {/* Commercial summary */}
      <div className="grid grid-cols-3 gap-px bg-charcoal border border-charcoal mb-10">
        <Stat label="Live connects" value={String(live.length)} />
        <Stat label="Pending requests" value={String(pending.length)} />
        <Stat
          label="Monthly recurring"
          value={mrcTotal > 0 ? money(mrcTotal) : "—"}
        />
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-charcoal p-12 text-center text-mid text-sm">
          No cross-connects yet. Click{" "}
          <span className="text-paper">Request cross-connect</span> to provision
          your first private interconnect.
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
              <th className="py-3 border-b border-charcoal">Z-side</th>
              <th className="py-3 border-b border-charcoal">Type</th>
              <th className="py-3 border-b border-charcoal">A-side</th>
              <th className="py-3 border-b border-charcoal">Speed</th>
              <th className="py-3 border-b border-charcoal">MRC</th>
              <th className="py-3 border-b border-charcoal">Status</th>
              <th className="py-3 border-b border-charcoal text-right">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-charcoal hover:bg-ink-2 transition-colors duration-100"
              >
                <td className="py-4 pr-6">
                  <Link
                    href={`/cross-connects/${r.id}`}
                    className="hover:text-signal transition-colors duration-150 ease-navon"
                  >
                    {r.zSideProvider ? (
                      <span className="text-paper">{r.zSideProvider}</span>
                    ) : null}
                    <span className={r.zSideProvider ? "text-mid" : "text-paper"}>
                      {r.zSideProvider ? ` · ${r.toLabel}` : r.toLabel}
                    </span>
                  </Link>
                </td>
                <td className="py-4 pr-6 text-mid">
                  {TYPE_LABEL[r.connectionType]}
                </td>
                <td className="py-4 pr-6 text-mid">
                  {r.fromCabinetLabel ?? "—"}
                  {r.siteCode ? (
                    <span className="text-slate"> · {r.siteCode}</span>
                  ) : null}
                </td>
                <td className="py-4 pr-6 font-mono text-paper">
                  {r.speedGbps} Gbps
                </td>
                <td className="py-4 pr-6 text-mid">
                  {r.monthlyChargeMinor ? money(r.monthlyChargeMinor) : "—"}
                </td>
                <td className="py-4 pr-6">
                  <span
                    className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] ${STATUS_CHIP[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="py-4 text-right text-mid">
                  {relativeTime(r.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-2 px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
        {label}
      </p>
      <p className="text-2xl font-medium tracking-tight text-paper mt-1.5">
        {value}
      </p>
    </div>
  );
}

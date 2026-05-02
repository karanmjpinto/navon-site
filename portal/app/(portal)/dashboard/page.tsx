import { desc, gte } from "drizzle-orm";
import { metricsSeed } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { MetricArea } from "@/components/charts";

export default async function DashboardPage() {
  const { orgId, name } = await requireSession();
  const since = new Date(Date.now() - 24 * 3600_000);

  const rows = await withOrgContext(orgId, async (tx) =>
    tx
      .select()
      .from(metricsSeed)
      .where(gte(metricsSeed.ts, since))
      .orderBy(desc(metricsSeed.ts))
      .limit(96),
  );

  // Reverse for chronological left-to-right.
  const series = rows.slice().reverse();
  const last = series.at(-1);

  const power = series.map((r) => ({ ts: r.ts.getTime(), value: r.powerKw }));
  const temp = series.map((r) => ({ ts: r.ts.getTime(), value: r.tempC }));
  const bw = series.map((r) => ({ ts: r.ts.getTime(), value: r.bandwidthGbps }));

  const kwhWindow = series.length
    ? +(series.at(-1)!.powerKwh - series[0].powerKwh).toFixed(1)
    : 0;

  return (
    <div className="max-w-6xl space-y-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
          Last 24 hours
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Welcome{name ? `, ${name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-mid text-sm mt-2 max-w-xl">
          Power, environment, and bandwidth across your deployment. Phase 2 will
          replace this with live DCIM ingestion.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-charcoal border border-charcoal">
        <Tile
          label="Power draw"
          value={last ? last.powerKw.toFixed(2) : "—"}
          unit="kW"
          sub={`${kwhWindow} kWh in window`}
        />
        <Tile
          label="Inlet temp"
          value={last ? last.tempC.toFixed(1) : "—"}
          unit="°C"
          sub="Cold-aisle sensors"
        />
        <Tile
          label="Bandwidth"
          value={last ? last.bandwidthGbps.toFixed(2) : "—"}
          unit="Gbps"
          sub="95th percentile"
        />
      </section>

      <section className="space-y-10">
        <ChartBlock title="Power (kW)" unit="kW" data={power} />
        <ChartBlock title="Temperature (°C)" unit="°C" data={temp} />
        <ChartBlock title="Bandwidth (Gbps)" unit="Gbps" data={bw} />
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
}) {
  return (
    <div className="bg-ink p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate mb-3">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-medium">{value}</span>
        <span className="text-mid text-sm">{unit}</span>
      </div>
      <p className="text-xs text-slate">{sub}</p>
    </div>
  );
}

function ChartBlock({
  title,
  unit,
  data,
}: {
  title: string;
  unit: string;
  data: Array<{ ts: number; value: number }>;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
        {title}
      </p>
      <div className="border border-charcoal p-3 bg-ink-2">
        <MetricArea data={data} unit={unit} />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import { getCapacityData } from "./actions";
import type { CapacityData, SitePower } from "./actions";

function GaugeBar({ current, capacity }: { current: number | null; capacity: number }) {
  if (capacity === 0) return <div className="text-xs text-gray-400">No cap set</div>;
  const pct = current !== null ? Math.min((current / capacity) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{current !== null ? `${current} kW` : "—"}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400">{capacity} kW allocated</div>
    </div>
  );
}

function Sparkline({ data }: { data: Array<{ ts: string; avgKw: number }> }) {
  if (data.length < 2) return <div className="text-xs text-gray-400">Insufficient data</div>;

  const values = data.map((d) => d.avgKw);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200;
  const h = 40;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.avgKw - min) / range) * h;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#E7FF00"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SiteCard({ site }: { site: SitePower }) {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const trend = range === "7d" ? site.trend7d : site.trend30d;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{site.siteName}</h3>
          <p className="text-xs text-gray-500 font-mono">{site.siteCode}</p>
        </div>
        {site.pue !== null && (
          <div className="text-right">
            <p className="text-xs text-gray-400">PUE</p>
            <p className="text-lg font-semibold text-gray-900">{site.pue}</p>
          </div>
        )}
      </div>

      <GaugeBar current={site.currentKw} capacity={site.allocatedKw} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">80% cap forecast</p>
          <p className="text-sm font-medium text-gray-700">{site.forecastHit80pct}</p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs px-2 py-1 rounded ${range === r ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {trend.length > 0 ? (
        <div>
          <p className="text-xs text-gray-400 mb-2">Power kW — {range} daily avg</p>
          <Sparkline data={trend} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{trend[0]?.ts?.slice(0, 10)}</span>
            <span>{trend[trend.length - 1]?.ts?.slice(0, 10)}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">No trend data yet — start mock-bms or connect a real BMS source.</p>
      )}
    </div>
  );
}

export default function CapacityPage() {
  const [data, setData] = useState<CapacityData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const d = await getCapacityData();
      setData(d);
    });
  }, []);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Capacity</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live power draw, PUE, and trend per site — updated from BMS telemetry.
          </p>
        </div>
        {data?.lastUpdated && (
          <p className="text-xs text-gray-400">
            Last reading: {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {isPending || !data ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : data.sites.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No sites found</p>
          <p className="text-sm mt-1">Sync NetBox to populate sites.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.sites.map((site) => (
            <SiteCard key={site.siteId} site={site} />
          ))}
        </div>
      )}

      {!isPending && data && data.sites.length > 0 && data.sites.every((s) => s.currentKw === null) && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          <strong>No BMS readings yet.</strong> Run <code className="font-mono bg-yellow-100 px-1 rounded">pnpm mock:bms</code> to populate live data,
          or configure a real BMS adapter to POST to <code className="font-mono bg-yellow-100 px-1 rounded">/api/metrics/bms</code>.
        </div>
      )}
    </div>
  );
}

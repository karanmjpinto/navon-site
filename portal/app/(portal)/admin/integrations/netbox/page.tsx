"use client";

import { useState } from "react";
import { triggerNetBoxSync } from "./actions";
import type { OrgSyncResult } from "@/workers/netbox-sync";

export default function NetBoxIntegrationPage() {
  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState<string | null>(null);
  const [results, setResults] = useState<OrgSyncResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await triggerNetBoxSync();
      if (res.ok) {
        setResults(res.results);
        setRanAt(res.ranAt);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
        Admin · Integrations
      </p>
      <div className="flex items-end justify-between mb-10">
        <h1 className="text-3xl font-medium tracking-tight">NetBox sync</h1>
        <button
          onClick={handleSync}
          disabled={running}
          className="px-5 py-2.5 border border-signal text-signal text-[13px] font-mono uppercase tracking-[0.14em] hover:bg-signal hover:text-ink transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? "Syncing…" : "Run sync now"}
        </button>
      </div>

      <div className="border border-charcoal bg-ink-2 p-5 mb-8 space-y-2 text-sm text-mid">
        <p>
          Pulls sites, racks, devices, and circuits from NetBox into the portal.
          Runs automatically every 6 hours. Upserts by{" "}
          <code className="font-mono text-paper text-xs">
            (org, external_id)
          </code>{" "}
          — existing manual records are never overwritten.
        </p>
        <p className="text-xs">
          Tenant slug in NetBox must match org slug in Navon (join key).
          {!process.env.NETBOX_URL && (
            <span className="ml-2 text-signal">
              ⚠ NETBOX_URL not set — sync will fail.
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="border border-signal/40 bg-signal/5 px-4 py-3 text-sm text-signal mb-6">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <p className="text-xs font-mono text-mid">
            Last run: {ranAt ? new Date(ranAt).toLocaleString() : "—"}
          </p>
          {results.length === 0 && (
            <p className="text-sm text-mid border border-dashed border-charcoal p-8 text-center">
              No org/tenant slug matches found. Check that NetBox tenant slugs
              match Navon org slugs.
            </p>
          )}
          {results.map((r) => (
            <div key={r.orgId} className="border border-charcoal p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper">
                  {r.orgSlug}
                </p>
                <p className="text-xs font-mono text-mid">{r.durationMs}ms</p>
              </div>
              {r.error && (
                <p className="text-sm text-signal mb-3">{r.error}</p>
              )}
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-left text-slate border-b border-charcoal">
                    <th className="pb-2 pr-6">Object</th>
                    <th className="pb-2 pr-4 text-right">Fetched</th>
                    <th className="pb-2 pr-4 text-right">Upserted</th>
                    <th className="pb-2 pr-4 text-right">Archived</th>
                    <th className="pb-2 pr-4 text-right">Skipped</th>
                    <th className="pb-2 text-right">Errors</th>
                  </tr>
                </thead>
                <tbody className="text-mid">
                  {(
                    [
                      ["Sites", r.sites],
                      ["Racks → Cabinets", r.cabinets],
                      ["Devices", r.devices],
                      ["Circuits", r.circuits],
                      ["VLANs", r.vlans],
                      ["Prefixes", r.prefixes],
                      ["IP Addresses", r.ipAddresses],
                    ] as [string, typeof r.sites][]
                  ).map(([label, c]) => (
                    <tr key={label} className="border-b border-charcoal/40">
                      <td className="py-2 pr-6 text-light">{label}</td>
                      <td className="py-2 pr-4 text-right">{c.fetched}</td>
                      <td className="py-2 pr-4 text-right text-paper">{c.upserted}</td>
                      <td className="py-2 pr-4 text-right">{c.archived}</td>
                      <td className="py-2 pr-4 text-right">{c.skipped}</td>
                      <td className={`py-2 text-right ${c.errored > 0 ? "text-signal" : ""}`}>
                        {c.errored}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import { getNetworkData } from "./actions";

type Tab = "ip_addresses" | "prefixes" | "vlans";

interface IpRow {
  id: string;
  address: string;
  status: string;
  dnsName: string | null;
  description: string | null;
  deviceLabel: string | null;
  lastSyncedAt: Date | null;
}

interface PrefixRow {
  id: string;
  prefix: string;
  status: string;
  role: string | null;
  description: string | null;
  siteName: string | null;
  lastSyncedAt: Date | null;
}

interface VlanRow {
  id: string;
  vid: number;
  name: string;
  status: string;
  description: string | null;
  siteName: string | null;
  lastSyncedAt: Date | null;
}

interface NetworkData {
  ipAddresses: IpRow[];
  prefixes: PrefixRow[];
  vlans: VlanRow[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  reserved: "bg-yellow-100 text-yellow-800",
  deprecated: "bg-red-100 text-red-800",
  dhcp: "bg-blue-100 text-blue-800",
  slaac: "bg-blue-100 text-blue-800",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function relTime(d: Date | null): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NetworkPage() {
  const [tab, setTab] = useState<Tab>("ip_addresses");
  const [data, setData] = useState<NetworkData | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const d = await getNetworkData();
      setData(d);
    });
  }, []);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "ip_addresses", label: "IP Addresses", count: data?.ipAddresses.length ?? 0 },
    { key: "prefixes", label: "Prefixes", count: data?.prefixes.length ?? 0 },
    { key: "vlans", label: "VLANs", count: data?.vlans.length ?? 0 },
  ];

  const q = search.toLowerCase();

  const filteredIps = (data?.ipAddresses ?? []).filter(
    (r) => !q || r.address.includes(q) || (r.dnsName ?? "").includes(q) || (r.description ?? "").includes(q),
  );
  const filteredPrefixes = (data?.prefixes ?? []).filter(
    (r) => !q || r.prefix.includes(q) || (r.role ?? "").includes(q) || (r.description ?? "").includes(q),
  );
  const filteredVlans = (data?.vlans ?? []).filter(
    (r) => !q || r.name.toLowerCase().includes(q) || String(r.vid).includes(q),
  );

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Network</h1>
        <p className="mt-1 text-sm text-gray-500">
          IP addresses, prefixes, and VLANs assigned to your organisation — synced from NetBox.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(""); }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                tab === t.key
                  ? "border-yellow-400 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder={`Search ${tab === "ip_addresses" ? "addresses, DNS names" : tab === "prefixes" ? "prefixes, roles" : "VLANs"}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-yellow-400 focus:ring-yellow-400 focus:outline-none"
        />
      </div>

      {/* Content */}
      {isPending || !data ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <>
          {tab === "ip_addresses" && (
            filteredIps.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Address", "Status", "DNS Name", "Description", "Device", "Last synced"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIps.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{r.address}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-gray-600">{r.dnsName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.description ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{r.deviceLabel ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{relTime(r.lastSyncedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "prefixes" && (
            filteredPrefixes.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Prefix", "Status", "Role", "Site", "Description", "Last synced"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPrefixes.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{r.prefix}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-gray-600">{r.role ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{r.siteName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.description ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{relTime(r.lastSyncedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "vlans" && (
            filteredVlans.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["VLAN ID", "Name", "Status", "Site", "Description", "Last synced"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVlans.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.vid}</td>
                      <td className="px-4 py-3 text-gray-900">{r.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-gray-600">{r.siteName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.description ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{relTime(r.lastSyncedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-500">
      <p className="text-lg font-medium">No network resources assigned yet</p>
      <p className="text-sm mt-1">Contact your account manager to have prefixes and IP addresses allocated.</p>
    </div>
  );
}

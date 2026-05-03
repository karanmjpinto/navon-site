import { sql } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { userMembership } from "@/lib/rbac";
import { currentOrgId } from "@/lib/tenant";
import { redirect } from "next/navigation";

interface SourceHealth {
  sourceId: string;
  metric: string;
  orgId: string;
  lastSeen: Date;
  readingCount: number;
  stale: boolean;
}

async function getBmsHealth(): Promise<SourceHealth[]> {
  try {
    const rows = await db.execute(sql.raw(`
      SELECT DISTINCT ON (source_id, metric)
        source_id,
        metric,
        org_id,
        recorded_at AS last_seen,
        COUNT(*) OVER (PARTITION BY source_id, metric) AS reading_count
      FROM bms_metrics
      ORDER BY source_id, metric, recorded_at DESC
    `)) as unknown as Array<{
      source_id: string;
      metric: string;
      org_id: string;
      last_seen: string;
      reading_count: number;
    }>;

    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    return rows.map((r) => ({
      sourceId: r.source_id,
      metric: r.metric,
      orgId: r.org_id,
      lastSeen: new Date(r.last_seen),
      readingCount: Number(r.reading_count),
      stale: new Date(r.last_seen).getTime() < fiveMinAgo,
    }));
  } catch {
    return [];
  }
}

export default async function AdminBmsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const orgId = await currentOrgId(userId);
  if (!orgId) redirect("/login");

  const membership = await userMembership(userId, orgId);
  if (membership?.role !== "admin") redirect("/dashboard");

  const sources = await getBmsHealth();
  const staleCount = sources.filter((s) => s.stale).length;
  const healthyCount = sources.length - staleCount;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">BMS Source Health</h1>
        <p className="mt-1 text-sm text-gray-500">
          BMS sources that have reported in the last 5 minutes vs. gone stale.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-3">
          <p className="text-xs text-green-600">Healthy</p>
          <p className="text-2xl font-semibold text-green-700">{healthyCount}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-3">
          <p className="text-xs text-red-600">Stale</p>
          <p className="text-2xl font-semibold text-red-700">{staleCount}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-3">
          <p className="text-xs text-gray-500">Total sources</p>
          <p className="text-2xl font-semibold text-gray-700">{sources.length}</p>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          No BMS readings received yet. Run <code className="font-mono bg-yellow-100 px-1 rounded">pnpm mock:bms</code> in the repo root to generate test data,
          or configure a real BMS adapter to POST to <code className="font-mono bg-yellow-100 px-1 rounded">/api/metrics/bms</code>.
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Source", "Metric", "Last seen", "Readings", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sources.map((s, i) => (
              <tr key={i} className={s.stale ? "bg-red-50" : "hover:bg-gray-50"}>
                <td className="px-4 py-3 font-mono text-gray-900">{s.sourceId}</td>
                <td className="px-4 py-3 text-gray-600">{s.metric}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{s.lastSeen.toISOString().replace("T", " ").slice(0, 19)} UTC</td>
                <td className="px-4 py-3 text-gray-600">{s.readingCount.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.stale ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    {s.stale ? "stale" : "healthy"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

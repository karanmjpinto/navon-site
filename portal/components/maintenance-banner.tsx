import Link from "next/link";
import { eq, and, lte, gte } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceWindows } from "@/db/schema";
import { datetime } from "@/lib/format";

// Renders nothing if no active or imminent (< 48h) maintenance window.
// Otherwise: yellow strip with summary + window range.
export async function MaintenanceBanner({ orgId }: { orgId: string }) {
  const cutoff = new Date(Date.now() + 48 * 3600_000);
  const now = new Date();

  const upcoming = await db
    .select()
    .from(maintenanceWindows)
    .where(
      and(
        eq(maintenanceWindows.orgId, orgId),
        lte(maintenanceWindows.startsAt, cutoff),
        gte(maintenanceWindows.endsAt, now),
      ),
    )
    .limit(3);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-signal text-ink px-8 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-[11px] uppercase tracking-[0.24em]">
          Maintenance
        </span>
        <span className="text-sm truncate">
          {upcoming.length === 1
            ? upcoming[0].summary
            : `${upcoming.length} scheduled windows`}
          <span className="ml-2 text-ink/70">
            ({datetime(upcoming[0].startsAt)} → {datetime(upcoming[0].endsAt)})
          </span>
        </span>
      </div>
      <Link
        href="/maintenance"
        className="text-xs underline underline-offset-4 whitespace-nowrap"
      >
        Details →
      </Link>
    </div>
  );
}

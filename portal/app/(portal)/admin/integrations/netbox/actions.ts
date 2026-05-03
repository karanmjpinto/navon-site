"use server";

import { requireSession } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";
import { runNetBoxSync } from "@/workers/netbox-sync";
import type { OrgSyncResult } from "@/workers/netbox-sync";

export type TriggerSyncResult =
  | { ok: true; results: OrgSyncResult[]; ranAt: string }
  | { ok: false; error: string };

export async function triggerNetBoxSync(): Promise<TriggerSyncResult> {
  const { userId, orgId } = await requireSession();
  const membership = await userMembership(userId, orgId);
  if (membership?.role !== "admin") {
    return { ok: false, error: "Admin role required." };
  }

  if (!process.env.NETBOX_URL || !process.env.NETBOX_TOKEN) {
    return { ok: false, error: "NETBOX_URL and NETBOX_TOKEN are not configured." };
  }

  try {
    const results = await runNetBoxSync();
    return { ok: true, results, ranAt: new Date().toISOString() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed with unknown error.",
    };
  }
}

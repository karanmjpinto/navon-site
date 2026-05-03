import cron from "node-cron";
import { runNetBoxSync } from "@/workers/netbox-sync";

let started = false;

// Called once from instrumentation.ts when the Next.js server starts.
// Guard against double-registration (Next.js hot-reload can call register() twice).
export function startNetBoxCron(): void {
  if (started) return;
  started = true;

  if (!process.env.NETBOX_URL || !process.env.NETBOX_TOKEN) {
    console.log("[netbox-cron] NETBOX_URL/TOKEN not set — sync disabled");
    return;
  }

  // Every 6 hours: minute 0, every 6th hour
  cron.schedule("0 */6 * * *", async () => {
    console.log("[netbox-cron] starting scheduled sync…");
    try {
      const results = await runNetBoxSync();
      const totals = results.reduce(
        (acc, r) => ({
          upserted: acc.upserted + r.sites.upserted + r.cabinets.upserted + r.devices.upserted + r.circuits.upserted,
          errored: acc.errored + r.sites.errored + r.cabinets.errored + r.devices.errored + r.circuits.errored,
        }),
        { upserted: 0, errored: 0 },
      );
      console.log(`[netbox-cron] sync complete — ${totals.upserted} upserted, ${totals.errored} errors`);
    } catch (err) {
      console.error("[netbox-cron] sync threw:", err);
    }
  });

  console.log("[netbox-cron] scheduled (every 6h)");
}

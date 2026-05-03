// Next.js instrumentation hook — runs once when the server process starts.
// Only wire up server-side code here; this file is excluded from the Edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNetBoxCron } = await import("./lib/netbox-cron");
    startNetBoxCron();
  }
}

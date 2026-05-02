// Seed: two demo orgs (Kenyan university + fintech) each with an admin
// user (password "navon-demo-2026"), one site, two cabinets, devices,
// cross-connects, tickets, invoices, notifications, and 7 days of
// minute-level synthetic metrics.
// Idempotent at the DB level only when the DB is empty — drop the schema
// and re-run if you want a clean slate.
//
// Run: DATABASE_URL=... pnpm db:seed
import { db } from "./index";
import {
  orgs,
  users,
  memberships,
  tickets,
  ticketComments,
  invoices,
  invoiceLines,
  metricsSeed,
  sites,
  cabinets,
  devices,
  crossConnects,
  notifications,
  ipRanges,
  ipAssignments,
  alertRules,
  maintenanceWindows,
} from "./schema";
import { hashPassword } from "../lib/password";

async function main() {
  const passwordHash = await hashPassword("navon-demo-2026");

  const [uniOrg, fintechOrg] = await db
    .insert(orgs)
    .values([
      { name: "University of Nairobi", slug: "uon" },
      { name: "Pesa Mobile Ltd", slug: "pesa-mobile" },
    ])
    .returning();

  const [uniAdmin, fintechAdmin] = await db
    .insert(users)
    .values([
      { name: "Wanjiru Kamau", email: "wanjiru@uon.demo", passwordHash },
      { name: "Brian Otieno", email: "brian@pesa.demo", passwordHash },
    ])
    .returning();

  await db.insert(memberships).values([
    { userId: uniAdmin.id, orgId: uniOrg.id, role: "admin" },
    { userId: fintechAdmin.id, orgId: fintechOrg.id, role: "admin" },
  ]);

  // Sites
  const [uniSite, fintechSite] = await db
    .insert(sites)
    .values([
      {
        orgId: uniOrg.id,
        name: "Hells Gate Deep Tech Park",
        code: "HG-01",
        address: "Naivasha, Kenya",
      },
      {
        orgId: fintechOrg.id,
        name: "Hells Gate Deep Tech Park",
        code: "HG-01",
        address: "Naivasha, Kenya",
      },
    ])
    .returning();

  // Cabinets
  const cabRows = await db
    .insert(cabinets)
    .values([
      {
        orgId: uniOrg.id,
        siteId: uniSite.id,
        label: "A12",
        rackUnits: 47,
        powerCapKw: 8,
      },
      {
        orgId: uniOrg.id,
        siteId: uniSite.id,
        label: "A13",
        rackUnits: 47,
        powerCapKw: 8,
      },
      {
        orgId: fintechOrg.id,
        siteId: fintechSite.id,
        label: "B07",
        rackUnits: 42,
        powerCapKw: 6,
      },
    ])
    .returning();

  const uniA12 = cabRows.find(
    (c) => c.orgId === uniOrg.id && c.label === "A12",
  )!;
  const uniA13 = cabRows.find(
    (c) => c.orgId === uniOrg.id && c.label === "A13",
  )!;
  const fintechB07 = cabRows.find((c) => c.orgId === fintechOrg.id)!;

  // Devices
  await db.insert(devices).values([
    {
      orgId: uniOrg.id,
      cabinetId: uniA12.id,
      label: "compute-01",
      vendor: "Supermicro",
      model: "SYS-741GE-TNRT",
      role: "compute",
      rackUStart: 1,
      rackUSize: 4,
      serial: "SM-2026-0142",
    },
    {
      orgId: uniOrg.id,
      cabinetId: uniA12.id,
      label: "compute-02",
      vendor: "Supermicro",
      model: "SYS-741GE-TNRT",
      role: "compute",
      rackUStart: 5,
      rackUSize: 4,
      serial: "SM-2026-0143",
    },
    {
      orgId: uniOrg.id,
      cabinetId: uniA12.id,
      label: "tor-sw-01",
      vendor: "Arista",
      model: "7050X3-32S",
      role: "network",
      rackUStart: 47,
      rackUSize: 1,
      serial: "AR-7050-991",
    },
    {
      orgId: uniOrg.id,
      cabinetId: uniA13.id,
      label: "storage-01",
      vendor: "PureStorage",
      model: "FlashArray //X20",
      role: "storage",
      rackUStart: 10,
      rackUSize: 6,
      serial: "PS-FX-44721",
    },
    {
      orgId: fintechOrg.id,
      cabinetId: fintechB07.id,
      label: "edge-01",
      vendor: "Dell",
      model: "PowerEdge R760",
      role: "compute",
      rackUStart: 1,
      rackUSize: 2,
      serial: "DL-R760-9982",
    },
  ]);

  // Cross-connects
  await db.insert(crossConnects).values([
    {
      orgId: uniOrg.id,
      fromCabinetId: uniA12.id,
      toLabel: "MMR rack 3, port 12 (Liquid Telecom)",
      speedGbps: 10,
      media: "fiber_sm",
      status: "provisioned",
      provisionedAt: new Date(Date.now() - 60 * 24 * 3600_000),
    },
    {
      orgId: uniOrg.id,
      fromCabinetId: uniA12.id,
      toLabel: "A13 (private interconnect)",
      speedGbps: 100,
      media: "fiber_sm",
      status: "provisioned",
      provisionedAt: new Date(Date.now() - 30 * 24 * 3600_000),
    },
    {
      orgId: fintechOrg.id,
      fromCabinetId: fintechB07.id,
      toLabel: "MMR rack 1, port 4 (Safaricom)",
      speedGbps: 1,
      media: "fiber_sm",
      status: "provisioned",
      provisionedAt: new Date(Date.now() - 90 * 24 * 3600_000),
    },
  ]);

  // Tickets
  const now = new Date();
  await db.insert(tickets).values([
    {
      orgId: uniOrg.id,
      createdBy: uniAdmin.id,
      subject: "Remote hands: replace failed PSU on rack A12",
      body: "Power supply on the second compute node is showing amber. Please swap with the spare in the cage.",
      status: "in_progress",
      serviceType: "remote_hands",
      priority: "high",
      slaDueAt: new Date(now.getTime() + 4 * 3600_000),
    },
    {
      orgId: uniOrg.id,
      createdBy: uniAdmin.id,
      subject: "New cross-connect to upstream provider",
      body: "We need a 10G cross-connect from rack A12 to the Liquid Telecom meet-me-room.",
      status: "open",
      serviceType: "cross_connect",
      priority: "normal",
    },
    {
      orgId: fintechOrg.id,
      createdBy: fintechAdmin.id,
      subject: "Bandwidth bump for end-of-month settlement",
      body: "Temporarily lift to 5 Gbps from 28th to 31st.",
      status: "resolved",
      serviceType: "bandwidth",
      priority: "normal",
      resolvedAt: new Date(now.getTime() - 24 * 3600_000),
    },
  ]);

  const ticketRows = await db.select().from(tickets);
  const firstUni = ticketRows.find(
    (t) => t.orgId === uniOrg.id && t.status === "in_progress",
  );
  if (firstUni) {
    await db.insert(ticketComments).values([
      {
        ticketId: firstUni.id,
        orgId: uniOrg.id,
        authorId: uniAdmin.id,
        body: "Spare is in the bottom of the cage, marked PSU-04. Thanks.",
      },
    ]);
  }

  // Invoices
  const period = new Date();
  period.setDate(1);
  const periodStart = new Date(period.getFullYear(), period.getMonth() - 1, 1);
  const periodEnd = new Date(period.getFullYear(), period.getMonth(), 0);

  const [uniInv, fintechInv] = await db
    .insert(invoices)
    .values([
      {
        orgId: uniOrg.id,
        number: `INV-${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, "0")}-001`,
        periodStart,
        periodEnd,
        status: "issued",
        currency: "KES",
        totalMinor: 1_245_000_00,
        dueAt: new Date(now.getTime() + 14 * 24 * 3600_000),
      },
      {
        orgId: fintechOrg.id,
        number: `INV-${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, "0")}-002`,
        periodStart,
        periodEnd,
        status: "paid",
        currency: "KES",
        totalMinor: 875_000_00,
        dueAt: new Date(now.getTime() - 5 * 24 * 3600_000),
        paidAt: new Date(now.getTime() - 1 * 24 * 3600_000),
      },
    ])
    .returning();

  await db.insert(invoiceLines).values([
    {
      invoiceId: uniInv.id,
      orgId: uniOrg.id,
      category: "power",
      description: "Power consumption — 12,450 kWh @ KES 18.00/kWh",
      quantity: 12450,
      unitPriceMinor: 18_00,
      amountMinor: 224_100_00,
    },
    {
      invoiceId: uniInv.id,
      orgId: uniOrg.id,
      category: "space",
      description: "Cabinet 47U — A12 (monthly)",
      quantity: 1,
      unitPriceMinor: 850_000_00,
      amountMinor: 850_000_00,
    },
    {
      invoiceId: uniInv.id,
      orgId: uniOrg.id,
      category: "bandwidth",
      description: "1 Gbps committed transit",
      quantity: 1,
      unitPriceMinor: 170_900_00,
      amountMinor: 170_900_00,
    },
    {
      invoiceId: fintechInv.id,
      orgId: fintechOrg.id,
      category: "power",
      description: "Power consumption — 8,900 kWh @ KES 18.00/kWh",
      quantity: 8900,
      unitPriceMinor: 18_00,
      amountMinor: 160_200_00,
    },
    {
      invoiceId: fintechInv.id,
      orgId: fintechOrg.id,
      category: "space",
      description: "Cabinet 42U — B07 (monthly)",
      quantity: 1,
      unitPriceMinor: 600_000_00,
      amountMinor: 600_000_00,
    },
    {
      invoiceId: fintechInv.id,
      orgId: fintechOrg.id,
      category: "bandwidth",
      description: "500 Mbps committed transit",
      quantity: 1,
      unitPriceMinor: 114_800_00,
      amountMinor: 114_800_00,
    },
  ]);

  // Notifications
  await db.insert(notifications).values([
    {
      orgId: uniOrg.id,
      userId: uniAdmin.id,
      kind: "billing",
      subject: `Invoice ${uniInv.number} issued`,
      body: `Period ${periodStart.toDateString()} – ${periodEnd.toDateString()}. Due in 14 days.`,
      link: `/billing/${uniInv.id}`,
    },
    {
      orgId: uniOrg.id,
      userId: uniAdmin.id,
      kind: "ticket",
      subject: "Remote hands ticket updated",
      body: "Comment added by Navon ops on rack A12 PSU swap.",
      link: firstUni ? `/tickets/${firstUni.id}` : null,
    },
    {
      orgId: uniOrg.id,
      userId: uniAdmin.id,
      kind: "alert",
      subject: "Power draw approaching cabinet cap",
      body: "Cabinet A12 hit 7.6 kW (95% of 8 kW cap) at 14:25. Consider redistribution.",
      readAt: new Date(now.getTime() - 6 * 3600_000),
    },
    {
      orgId: fintechOrg.id,
      userId: fintechAdmin.id,
      kind: "billing",
      subject: `Payment received for ${fintechInv.number}`,
      body: "Thank you. Receipt is attached on the invoice page.",
      link: `/billing/${fintechInv.id}`,
    },
  ]);

  // 7 days × every 15 minutes of synthetic metrics per org.
  const points = (
    orgId: string,
    basePower: number,
    baseTemp: number,
    baseBw: number,
  ) => {
    const rows: Array<{
      orgId: string;
      ts: Date;
      powerKw: number;
      powerKwh: number;
      tempC: number;
      bandwidthGbps: number;
    }> = [];
    let kwh = 0;
    for (let i = 0; i < 7 * 24 * 4; i++) {
      const ts = new Date(now.getTime() - (7 * 24 * 4 - i) * 15 * 60_000);
      const hour = ts.getHours();
      const dayCycle = Math.sin(((hour - 6) / 24) * Math.PI * 2);
      const noise = () => (Math.random() - 0.5) * 0.6;
      const powerKw = +(basePower + dayCycle * 1.2 + noise()).toFixed(2);
      kwh += (powerKw * 15) / 60;
      rows.push({
        orgId,
        ts,
        powerKw,
        powerKwh: +kwh.toFixed(2),
        tempC: +(baseTemp + dayCycle * 0.8 + noise() * 0.5).toFixed(2),
        bandwidthGbps: +(
          baseBw +
          Math.max(0, dayCycle) * baseBw * 0.4 +
          noise() * 0.1
        ).toFixed(3),
      });
    }
    return rows;
  };

  await db.insert(metricsSeed).values([
    ...points(uniOrg.id, 14.5, 22.5, 0.7),
    ...points(fintechOrg.id, 9.8, 22.0, 0.4),
  ]);

  // IP ranges + sample assignments
  const deviceRows = await db.select().from(devices);
  const uniRange = await db
    .insert(ipRanges)
    .values({
      orgId: uniOrg.id,
      siteId: uniSite.id,
      cidr: "10.20.10.0/24",
      description: "A12 management network",
      gateway: "10.20.10.1",
      vlanId: 200,
    })
    .returning();
  const fintechRange = await db
    .insert(ipRanges)
    .values({
      orgId: fintechOrg.id,
      siteId: fintechSite.id,
      cidr: "10.30.5.0/24",
      description: "B07 production network",
      gateway: "10.30.5.1",
      vlanId: 300,
    })
    .returning();

  const uniDev = deviceRows.filter((d) => d.orgId === uniOrg.id);
  const fintechDev = deviceRows.filter((d) => d.orgId === fintechOrg.id);
  await db.insert(ipAssignments).values([
    {
      orgId: uniOrg.id,
      rangeId: uniRange[0].id,
      address: "10.20.10.10",
      label: "compute-01 mgmt",
      deviceId: uniDev.find((d) => d.label === "compute-01")?.id ?? null,
    },
    {
      orgId: uniOrg.id,
      rangeId: uniRange[0].id,
      address: "10.20.10.11",
      label: "compute-02 mgmt",
      deviceId: uniDev.find((d) => d.label === "compute-02")?.id ?? null,
    },
    {
      orgId: uniOrg.id,
      rangeId: uniRange[0].id,
      address: "10.20.10.250",
      label: "tor-sw-01 mgmt",
      deviceId: uniDev.find((d) => d.label === "tor-sw-01")?.id ?? null,
    },
    {
      orgId: fintechOrg.id,
      rangeId: fintechRange[0].id,
      address: "10.30.5.10",
      label: "edge-01 mgmt",
      deviceId: fintechDev.find((d) => d.label === "edge-01")?.id ?? null,
    },
  ]);

  // Alert rules — one per org so the demo shows the feature pre-populated.
  await db.insert(alertRules).values([
    {
      orgId: uniOrg.id,
      createdBy: uniAdmin.id,
      name: "A12 power over 7 kW",
      metric: "power_kw",
      comparison: "gt",
      threshold: 7,
      sustainedMinutes: 5,
      notifyEmail: true,
    },
    {
      orgId: uniOrg.id,
      createdBy: uniAdmin.id,
      name: "Inlet temperature high",
      metric: "temp_c",
      comparison: "gt",
      threshold: 27,
      sustainedMinutes: 10,
      notifyEmail: false,
    },
    {
      orgId: fintechOrg.id,
      createdBy: fintechAdmin.id,
      name: "Edge power over 5 kW",
      metric: "power_kw",
      comparison: "gt",
      threshold: 5,
      sustainedMinutes: 5,
      notifyEmail: true,
    },
  ]);

  // One upcoming maintenance window so the banner shows up immediately.
  await db.insert(maintenanceWindows).values([
    {
      orgId: uniOrg.id,
      createdBy: uniAdmin.id,
      scope: "org",
      summary: "Quarterly UPS battery test",
      body:
        "Brief failover test on the A-feed. B-feed remains online; no customer-visible disruption expected. We'll be on-site if anything needs intervention.",
      startsAt: new Date(now.getTime() + 36 * 3600_000),
      endsAt: new Date(now.getTime() + 40 * 3600_000),
    },
  ]);

  console.log("✓ Seeded:");
  console.log(`  org ${uniOrg.name} (admin: ${uniAdmin.email})`);
  console.log(`  org ${fintechOrg.name} (admin: ${fintechAdmin.email})`);
  console.log("  password for both: navon-demo-2026");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

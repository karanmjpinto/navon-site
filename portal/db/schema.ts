import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  primaryKey,
  integer,
  bigint,
  doublePrecision,
  boolean,
  uuid,
  uniqueIndex,
  index,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Enums ─────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["admin", "technical", "finance"]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketServiceEnum = pgEnum("ticket_service", [
  "remote_hands",
  "cross_connect",
  "cabinet",
  "bandwidth",
  "ip_management",
  "other",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "overdue",
  "void",
]);

export const invoiceLineCategoryEnum = pgEnum("invoice_line_category", [
  "power",
  "space",
  "bandwidth",
  "service",
  "other",
]);

export const cabinetStatusEnum = pgEnum("cabinet_status", [
  "active",
  "decommissioned",
]);

export const deviceRoleEnum = pgEnum("device_role", [
  "compute",
  "storage",
  "network",
  "other",
]);

export const crossConnectStatusEnum = pgEnum("cross_connect_status", [
  "pending",
  "provisioned",
  "decommissioned",
]);

export const crossConnectMediaEnum = pgEnum("cross_connect_media", [
  "fiber_sm",
  "fiber_mm",
  "copper",
]);

export const mpesaStatusEnum = pgEnum("mpesa_status", [
  "initiated",
  "pending",
  "success",
  "failed",
]);

export const notificationKindEnum = pgEnum("notification_kind", [
  "info",
  "alert",
  "billing",
  "ticket",
  "system",
]);

export const alertMetricEnum = pgEnum("alert_metric", [
  "power_kw",
  "temp_c",
  "bandwidth_gbps",
]);

export const alertComparisonEnum = pgEnum("alert_comparison", [
  "gt",
  "lt",
]);

export const maintenanceScopeEnum = pgEnum("maintenance_scope", [
  "org",
  "site",
  "cabinet",
]);

export const feedbackSeverityEnum = pgEnum("feedback_severity", [
  "low",
  "medium",
  "high",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "new",
  "reviewed",
  "accepted",
  "rejected",
  "converted",
]);

export const workOrderStatusEnum = pgEnum("work_order_status", [
  "open",
  "in_progress",
  "blocked",
  "done",
]);

export const workOrderPriorityEnum = pgEnum("work_order_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const externalSourceEnum = pgEnum("external_source", [
  "netbox",
  "opendcim",
  "manual",
]);

// ── Tenants ───────────────────────────────────────────────────────
export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("orgs_slug_idx").on(t.slug),
}));

// ── Auth.js core tables ───────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

// ── Membership ────────────────────────────────────────────────────
export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.orgId] }),
  }),
);

// ── Tickets ───────────────────────────────────────────────────────
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    serviceType: ticketServiceEnum("service_type").notNull().default("remote_hands"),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    slaDueAt: timestamp("sla_due_at", { mode: "date" }),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
    closedAt: timestamp("closed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("tickets_org_idx").on(t.orgId),
    statusIdx: index("tickets_status_idx").on(t.orgId, t.status),
  }),
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index("ticket_comments_ticket_idx").on(t.ticketId),
  }),
);

// ── Invoices ──────────────────────────────────────────────────────
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    periodStart: timestamp("period_start", { mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("issued"),
    currency: text("currency").notNull().default("KES"),
    // Stored in minor units (cents) to avoid float drift.
    totalMinor: bigint("total_minor", { mode: "number" }).notNull().default(0),
    issuedAt: timestamp("issued_at", { mode: "date" }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { mode: "date" }).notNull(),
    paidAt: timestamp("paid_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("invoices_org_idx").on(t.orgId),
    numberIdx: uniqueIndex("invoices_number_idx").on(t.orgId, t.number),
  }),
);

export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    category: invoiceLineCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    quantity: doublePrecision("quantity").notNull().default(1),
    unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  },
  (t) => ({
    invoiceIdx: index("invoice_lines_invoice_idx").on(t.invoiceId),
  }),
);

// ── Audit log ─────────────────────────────────────────────────────
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => orgs.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("audit_org_idx").on(t.orgId, t.createdAt),
  }),
);

// ── Metrics seed (Phase 1 placeholder; converted to TimescaleDB
// hypertable in Phase 2 when real DCIM ingestion lands) ───────────
export const metricsSeed = pgTable(
  "metrics_seed",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { mode: "date" }).notNull(),
    powerKw: doublePrecision("power_kw").notNull(),
    powerKwh: doublePrecision("power_kwh").notNull(),
    tempC: doublePrecision("temp_c").notNull(),
    bandwidthGbps: doublePrecision("bandwidth_gbps").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.orgId, t.ts] }),
  }),
);

// ── Type exports ──────────────────────────────────────────────────
// ── Sites + cabinets + devices ────────────────────────────────────
// Physical facilities the customer occupies. PRD §4.2 multi-site view +
// §4.3 asset & inventory management.
export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(), // short label, eg. "HG-01"
    address: text("address"),
    country: text("country").notNull().default("KE"),
    externalId: text("external_id"),
    externalSource: externalSourceEnum("external_source"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("sites_org_idx").on(t.orgId),
    codeIdx: uniqueIndex("sites_code_idx").on(t.orgId, t.code),
  }),
);

export const cabinets = pgTable(
  "cabinets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    rackUnits: integer("rack_units").notNull().default(47),
    powerCapKw: doublePrecision("power_cap_kw").notNull().default(6),
    status: cabinetStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    externalId: text("external_id"),
    externalSource: externalSourceEnum("external_source"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    archivedAt: timestamp("archived_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("cabinets_org_idx").on(t.orgId),
    siteIdx: index("cabinets_site_idx").on(t.siteId),
    labelIdx: uniqueIndex("cabinets_label_idx").on(t.siteId, t.label),
  }),
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    cabinetId: uuid("cabinet_id")
      .notNull()
      .references(() => cabinets.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    vendor: text("vendor"),
    model: text("model"),
    serial: text("serial"),
    role: deviceRoleEnum("role").notNull().default("compute"),
    rackUStart: integer("rack_u_start"),
    rackUSize: integer("rack_u_size").notNull().default(1),
    externalId: text("external_id"),
    externalSource: externalSourceEnum("external_source"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    archivedAt: timestamp("archived_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("devices_org_idx").on(t.orgId),
    cabinetIdx: index("devices_cabinet_idx").on(t.cabinetId),
  }),
);

export const crossConnects = pgTable(
  "cross_connects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    fromCabinetId: uuid("from_cabinet_id")
      .notNull()
      .references(() => cabinets.id, { onDelete: "cascade" }),
    toLabel: text("to_label").notNull(), // free-form: "MMR rack 3, port 12"
    speedGbps: doublePrecision("speed_gbps").notNull(),
    media: crossConnectMediaEnum("media").notNull().default("fiber_sm"),
    status: crossConnectStatusEnum("status").notNull().default("pending"),
    externalId: text("external_id"),
    externalSource: externalSourceEnum("external_source"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    provisionedAt: timestamp("provisioned_at", { mode: "date" }),
  },
  (t) => ({
    orgIdx: index("cross_connects_org_idx").on(t.orgId),
    fromIdx: index("cross_connects_from_idx").on(t.fromCabinetId),
  }),
);

// ── Notifications (in-app) ────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    kind: notificationKindEnum("kind").notNull().default("info"),
    subject: text("subject").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("notifications_org_idx").on(t.orgId, t.createdAt),
    userIdx: index("notifications_user_idx").on(t.userId, t.readAt),
  }),
);

// ── Invites ───────────────────────────────────────────────────────
export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull(),
    token: text("token").notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex("invites_token_idx").on(t.token),
    orgIdx: index("invites_org_idx").on(t.orgId),
  }),
);

// ── Metrics ingestion API tokens ──────────────────────────────────
// Bearer tokens used by DCIM/BMS sources to POST telemetry. Stored as
// SHA-256 hash; only shown once at creation.
export const metricsTokens = pgTable(
  "metrics_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
  },
  (t) => ({
    orgIdx: index("metrics_tokens_org_idx").on(t.orgId),
    hashIdx: uniqueIndex("metrics_tokens_hash_idx").on(t.tokenHash),
  }),
);

// ── M-Pesa Daraja payments (Phase 2 stub) ─────────────────────────
// Records STK push attempts. Real Daraja integration lands when
// sandbox/production credentials are wired; for now these rows are
// created in "initiated" state by the UI and marked success/failed
// manually. Schema is shaped to accept the real flow later.
export const mpesaPayments = pgTable(
  "mpesa_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    status: mpesaStatusEnum("status").notNull().default("initiated"),
    darajaRequestId: text("daraja_request_id"),
    darajaCheckoutId: text("daraja_checkout_id"),
    darajaResultCode: integer("daraja_result_code"),
    darajaResultDesc: text("daraja_result_desc"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (t) => ({
    invoiceIdx: index("mpesa_invoice_idx").on(t.invoiceId),
    orgIdx: index("mpesa_org_idx").on(t.orgId),
  }),
);

// ── IPAM ──────────────────────────────────────────────────────────
// Ranges defined per site (typically one CIDR per VLAN). Individual IPs
// are tracked as assignments, optionally bound to a device.
export const ipRanges = pgTable(
  "ip_ranges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    cidr: text("cidr").notNull(),
    description: text("description"),
    gateway: text("gateway"),
    vlanId: integer("vlan_id"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("ip_ranges_org_idx").on(t.orgId),
    siteIdx: index("ip_ranges_site_idx").on(t.siteId),
    cidrIdx: uniqueIndex("ip_ranges_cidr_idx").on(t.orgId, t.cidr),
  }),
);

export const ipAssignments = pgTable(
  "ip_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    rangeId: uuid("range_id")
      .notNull()
      .references(() => ipRanges.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    label: text("label"),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    rangeIdx: index("ip_assignments_range_idx").on(t.rangeId),
    addressIdx: uniqueIndex("ip_assignments_address_idx").on(
      t.rangeId,
      t.address,
    ),
  }),
);

// ── Alert rules + events ──────────────────────────────────────────
// Customer-defined thresholds. Evaluator runs on every metrics
// ingest call (POST /api/metrics) and creates a notification + email
// when a rule fires. lastTriggeredAt suppresses duplicate fires
// inside the same `sustained_minutes` window.
export const alertRules = pgTable(
  "alert_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    metric: alertMetricEnum("metric").notNull(),
    comparison: alertComparisonEnum("comparison").notNull(),
    threshold: doublePrecision("threshold").notNull(),
    sustainedMinutes: integer("sustained_minutes").notNull().default(5),
    notifyEmail: boolean("notify_email").notNull().default(true),
    enabled: boolean("enabled").notNull().default(true),
    lastTriggeredAt: timestamp("last_triggered_at", { mode: "date" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("alert_rules_org_idx").on(t.orgId),
  }),
);

export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => alertRules.id, { onDelete: "cascade" }),
    observedValue: doublePrecision("observed_value").notNull(),
    startedAt: timestamp("started_at", { mode: "date" }).notNull(),
    endedAt: timestamp("ended_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("alert_events_org_idx").on(t.orgId, t.startedAt),
    ruleIdx: index("alert_events_rule_idx").on(t.ruleId),
  }),
);

// ── Maintenance windows ───────────────────────────────────────────
// Scheduled by admins; the dashboard shows a banner when one is active
// or imminent (< 48h). PRD §4.8 Maintenance alerts.
export const maintenanceWindows = pgTable(
  "maintenance_windows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    scope: maintenanceScopeEnum("scope").notNull().default("org"),
    targetId: uuid("target_id"),
    summary: text("summary").notNull(),
    body: text("body"),
    startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { mode: "date" }).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("maintenance_org_idx").on(t.orgId, t.startsAt),
  }),
);

// ── Internal feedback → work-order flow ──────────────────────────
// For Karan's team to report issues/ideas about the portal itself.
// Distinct from customer tickets (which are for support requests).

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    reason: text("reason").notNull(),
    severity: feedbackSeverityEnum("severity").notNull().default("medium"),
    status: feedbackStatusEnum("status").notNull().default("new"),
    rejectionReason: text("rejection_reason"),
    workOrderId: uuid("work_order_id"), // set on convert; no FK to avoid circular dep
    url: text("url"),
    viewport: text("viewport"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("feedback_org_idx").on(t.orgId, t.createdAt),
    userIdx: index("feedback_user_idx").on(t.userId),
    statusIdx: index("feedback_status_idx").on(t.orgId, t.status),
  }),
);

export const feedbackAttachments = pgTable(
  "feedback_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    feedbackIdx: index("feedback_attachments_feedback_idx").on(t.feedbackId),
  }),
);

export const feedbackComments = pgTable(
  "feedback_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    feedbackIdx: index("feedback_comments_feedback_idx").on(t.feedbackId),
  }),
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    sourceFeedbackId: uuid("source_feedback_id").references(
      () => feedback.id,
      { onDelete: "set null" },
    ),
    title: text("title").notNull(),
    description: text("description").notNull(),
    assigneeId: text("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    priority: workOrderPriorityEnum("priority").notNull().default("medium"),
    status: workOrderStatusEnum("status").notNull().default("open"),
    dueDate: date("due_date"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("work_orders_org_idx").on(t.orgId, t.createdAt),
    statusIdx: index("work_orders_status_idx").on(t.orgId, t.status),
  }),
);

export const workOrderComments = pgTable(
  "work_order_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    workOrderIdx: index("work_order_comments_wo_idx").on(t.workOrderId),
  }),
);

// ── IPAM (NetBox-synced) ──────────────────────────────────────────

export const vlans = pgTable(
  "vlans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    vid: integer("vid").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    description: text("description"),
    externalId: text("external_id"),
    externalSource: externalSourceEnum("external_source"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("vlans_org_idx").on(t.orgId),
  }),
);

export const prefixes = pgTable(
  "prefixes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    vlanId: uuid("vlan_id").references(() => vlans.id, { onDelete: "set null" }),
    prefix: text("prefix").notNull(),
    status: text("status").notNull().default("active"),
    role: text("role"),
    description: text("description"),
    isPool: boolean("is_pool").notNull().default(false),
    externalId: text("external_id"),
    externalSource: externalSourceEnum("external_source"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("prefixes_org_idx").on(t.orgId),
  }),
);

export const ipAddresses = pgTable(
  "ip_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    prefixId: uuid("prefix_id").references(() => prefixes.id, { onDelete: "set null" }),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
    address: text("address").notNull(),
    status: text("status").notNull().default("active"),
    dnsName: text("dns_name"),
    description: text("description"),
    externalId: text("external_id"),
    externalSource: externalSourceEnum("external_source"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("ip_addresses_org_idx").on(t.orgId),
    prefixIdx: index("ip_addresses_prefix_idx").on(t.prefixId),
  }),
);

export type Org = typeof orgs.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type Ticket = typeof tickets.$inferSelect;
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type TicketServiceType = (typeof ticketServiceEnum.enumValues)[number];
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number];
export type TicketComment = typeof ticketComments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type AuditEvent = typeof auditEvents.$inferSelect;
export type MetricsRow = typeof metricsSeed.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Cabinet = typeof cabinets.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type CrossConnect = typeof crossConnects.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type MetricsToken = typeof metricsTokens.$inferSelect;
export type MpesaPayment = typeof mpesaPayments.$inferSelect;
export type IpRange = typeof ipRanges.$inferSelect;
export type IpAssignment = typeof ipAssignments.$inferSelect;
export type AlertRule = typeof alertRules.$inferSelect;
export type AlertEvent = typeof alertEvents.$inferSelect;
export type MaintenanceWindow = typeof maintenanceWindows.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type FeedbackSeverity = (typeof feedbackSeverityEnum.enumValues)[number];
export type FeedbackStatus = (typeof feedbackStatusEnum.enumValues)[number];
export type FeedbackAttachment = typeof feedbackAttachments.$inferSelect;
export type FeedbackComment = typeof feedbackComments.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type WorkOrderStatus = (typeof workOrderStatusEnum.enumValues)[number];
export type WorkOrderPriority = (typeof workOrderPriorityEnum.enumValues)[number];
export type WorkOrderComment = typeof workOrderComments.$inferSelect;
export type Vlan = typeof vlans.$inferSelect;
export type Prefix = typeof prefixes.$inferSelect;
export type IpAddress = typeof ipAddresses.$inferSelect;

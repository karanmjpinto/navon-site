// Format helpers used across pages and PDFs.
// Currency stored as minor units (cents) per invoice schema.

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
});

export function money(minor: number, currency = "KES"): string {
  const major = minor / 100;
  if (currency === "KES") return KES.format(major);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
  }).format(major);
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function date(d: Date | string): string {
  const v = d instanceof Date ? d : new Date(d);
  return DATE.format(v);
}

const DATETIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function datetime(d: Date | string): string {
  const v = d instanceof Date ? d : new Date(d);
  return DATETIME.format(v);
}

export function relativeTime(d: Date | string): string {
  const v = d instanceof Date ? d : new Date(d);
  const diff = Date.now() - v.getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 14) return `${days}d ago`;
  return date(v);
}

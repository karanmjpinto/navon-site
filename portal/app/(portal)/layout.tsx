import Link from "next/link";
import type { Route } from "next";
import { auth, signOut } from "@/lib/auth";
import { unreadCount } from "./notifications/actions";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { FeedbackWidget } from "@/components/feedback-widget";

type NavLeaf = { href: Route; label: string };
type NavEntry = { label: string; href?: Route; items?: NavLeaf[] };

// Top-level nav, grouped into dropdowns so the bar stays uncluttered.
// Settings lives in the right-hand cluster (gear icon), not here.
const NAV: NavEntry[] = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Infrastructure",
    items: [
      { href: "/sites", label: "Sites" },
      { href: "/network", label: "Network" },
      { href: "/cross-connects", label: "Cross-connects" },
      { href: "/reports", label: "Reports" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/tickets", label: "Tickets" },
      { href: "/feedback", label: "Feedback" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/docs", label: "Docs" },
      { href: "/guide", label: "Guide" },
    ],
  },
  { label: "Billing", href: "/billing" },
];

const ADMIN_NAV: NavLeaf[] = [
  { href: "/admin/feedback", label: "FB queue" },
  { href: "/admin/work-orders", label: "Work orders" },
  { href: "/admin/integrations/netbox", label: "NetBox" },
  { href: "/admin/bms", label: "BMS health" },
];

// CSS-only dropdown: opens on hover and on keyboard focus (focus-within).
// The pt-3 wrapper bridges the gap between trigger and panel so the menu
// doesn't close as the cursor crosses it.
function NavDropdown({ label, items }: { label: string; items: NavLeaf[] }) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className="flex items-center gap-1.5 text-mid hover:text-paper group-focus-within:text-paper transition-colors duration-150 ease-navon"
      >
        {label}
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
          className="transition-transform duration-150 group-hover:translate-y-0.5"
        >
          <path
            d="M2 3.5 5 6.5 8 3.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="absolute left-0 top-full pt-3 hidden group-hover:block group-focus-within:block z-50">
        <div className="min-w-[180px] border border-charcoal bg-ink-2 py-1.5 shadow-2xl">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-sm text-mid hover:text-paper hover:bg-charcoal/40 transition-colors duration-150 ease-navon"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  let unread = 0;
  let userOrgId: string | null = null;
  let isAdmin = false;

  if (userId) {
    try {
      const { currentOrgId } = await import("@/lib/tenant");
      userOrgId = await currentOrgId(userId);
      if (userOrgId) {
        unread = await unreadCount(userId, userOrgId);
        const { userMembership } = await import("@/lib/rbac");
        const membership = await userMembership(userId, userOrgId);
        isAdmin = membership?.role === "admin";
      }
    } catch {}
  }

  return (
    <div className="min-h-screen flex flex-col">
      {userOrgId && <MaintenanceBanner orgId={userOrgId} />}
      <header className="flex items-center justify-between px-8 py-5 border-b border-charcoal">
        <div className="flex items-center gap-10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 bg-signal" aria-hidden />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-paper">
              Navon Portal
            </span>
          </Link>
          <nav className="flex items-center gap-7 text-sm">
            {NAV.map((item) =>
              item.items ? (
                <NavDropdown key={item.label} label={item.label} items={item.items} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  className="text-mid hover:text-paper transition-colors duration-150 ease-navon"
                >
                  {item.label}
                </Link>
              ),
            )}
            {isAdmin && (
              <>
                <span className="text-charcoal select-none">|</span>
                <NavDropdown label="Admin" items={ADMIN_NAV} />
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-5 text-xs text-mid">
          <Link
            href="/settings"
            className="flex items-center justify-center w-8 h-8 hover:text-paper transition-colors duration-150"
            aria-label="Settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <Link
            href="/notifications"
            className="relative flex items-center justify-center w-8 h-8 hover:text-paper transition-colors duration-150"
            aria-label="Notifications"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-mono bg-signal text-ink">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <a
            href="https://navonworld.com"
            className="text-mid hover:text-paper transition-colors duration-150 ease-navon"
          >
            navonworld.com ↗
          </a>
          <span>{session?.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-mid hover:text-paper transition-colors duration-150 ease-navon"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-8 py-10">{children}</main>
      <FeedbackWidget />
    </div>
  );
}

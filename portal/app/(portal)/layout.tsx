import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { unreadCount } from "./notifications/actions";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { FeedbackWidget } from "@/components/feedback-widget";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sites", label: "Sites" },
  { href: "/tickets", label: "Tickets" },
  { href: "/billing", label: "Billing" },
  { href: "/reports", label: "Reports" },
  { href: "/docs", label: "Docs" },
  { href: "/settings", label: "Settings" },
  { href: "/network", label: "Network" },
  { href: "/feedback", label: "Feedback" },
] as const;

const ADMIN_NAV = [
  { href: "/admin/feedback", label: "FB queue" },
  { href: "/admin/work-orders", label: "Work orders" },
  { href: "/admin/integrations/netbox", label: "NetBox" },
  { href: "/admin/bms", label: "BMS health" },
] as const;

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
          <nav className="flex items-center gap-6 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-mid hover:text-paper transition-colors duration-150 ease-navon"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <span className="text-charcoal select-none">|</span>
                {ADMIN_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-slate hover:text-paper transition-colors duration-150 ease-navon"
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-5 text-xs text-mid">
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

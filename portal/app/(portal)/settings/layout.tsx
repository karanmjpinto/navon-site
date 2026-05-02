import Link from "next/link";
import { auth } from "@/lib/auth";
import { currentOrgId } from "@/lib/tenant";
import { userMembership } from "@/lib/rbac";

const TABS = [
  { href: "/settings", label: "Profile", forAll: true },
  { href: "/settings/team", label: "Team", adminOnly: true },
  { href: "/settings/alerts", label: "Alerts", adminOnly: true },
  { href: "/settings/maintenance", label: "Maintenance", adminOnly: true },
  { href: "/settings/api", label: "Ingestion API", adminOnly: true },
  { href: "/settings/activity", label: "Activity", adminOnly: true },
] as const;

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let isAdmin = false;
  if (session?.user?.id) {
    const orgId = await currentOrgId(session.user.id);
    if (orgId) {
      const m = await userMembership(session.user.id, orgId);
      isAdmin = m?.role === "admin";
    }
  }

  const visible = TABS.filter((t) => ("forAll" in t) || ("adminOnly" in t && isAdmin));

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-6 border-b border-charcoal pb-3">
        {visible.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper transition-colors duration-150 ease-navon"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

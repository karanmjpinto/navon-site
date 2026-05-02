import Link from "next/link";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { notifications, type Notification } from "@/db/schema";
import { requireSession } from "@/lib/tenant";
import { relativeTime } from "@/lib/format";
import { Empty, Eyebrow } from "@/components/forms";
import { markRead, markAllRead } from "./actions";

const KIND_DOT: Record<Notification["kind"], string> = {
  alert: "bg-signal",
  billing: "bg-paper",
  ticket: "bg-paper",
  system: "bg-mid",
  info: "bg-mid",
};

export default async function NotificationsPage() {
  const { userId, orgId } = await requireSession();

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.orgId, orgId),
        or(eq(notifications.userId, userId), isNull(notifications.userId)),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const unreadCount = rows.filter((r) => !r.readAt).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-end justify-between mb-10">
        <div>
          <Eyebrow>Inbox</Eyebrow>
          <h1 className="text-3xl font-medium tracking-tight">
            Notifications
          </h1>
          <p className="text-mid text-sm mt-2">
            Threshold alerts, billing events, ticket updates, and system
            messages.
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-[13px] tracking-wide px-4 py-2 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty>No notifications yet.</Empty>
      ) : (
        <div className="border border-charcoal divide-y divide-charcoal">
          {rows.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 ${n.readAt ? "bg-ink-2" : "bg-ink"}`}
            >
              <span
                className={`inline-block h-2 w-2 mt-2 ${KIND_DOT[n.kind]}`}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`text-sm ${n.readAt ? "text-mid" : "text-paper"}`}
                  >
                    {n.subject}
                  </p>
                  <span className="font-mono text-[11px] text-mid whitespace-nowrap">
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
                {n.body && (
                  <p className="text-xs text-mid mt-1 leading-relaxed">
                    {n.body}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  {n.link && (
                    <Link
                      href={n.link as any}
                      className="text-xs text-signal hover:underline"
                    >
                      Open →
                    </Link>
                  )}
                  {!n.readAt && (
                    <form action={markRead}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className="text-xs text-mid hover:text-paper"
                      >
                        Mark read
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

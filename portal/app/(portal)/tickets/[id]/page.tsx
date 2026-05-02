import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import {
  tickets,
  ticketComments,
  users,
  type TicketStatus,
} from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { datetime, relativeTime } from "@/lib/format";
import { addComment, changeStatus } from "../actions";

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function TicketDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSession();

  const data = await withOrgContext(ctx.orgId, async (tx) => {
    const [t] = await tx
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), eq(tickets.orgId, ctx.orgId)))
      .limit(1);
    if (!t) return null;
    const comments = await tx
      .select({
        id: ticketComments.id,
        body: ticketComments.body,
        createdAt: ticketComments.createdAt,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(ticketComments)
      .leftJoin(users, eq(users.id, ticketComments.authorId))
      .where(eq(ticketComments.ticketId, id))
      .orderBy(asc(ticketComments.createdAt));
    return { ticket: t, comments };
  });

  if (!data) notFound();
  const { ticket, comments } = data;

  return (
    <div className="max-w-3xl">
      <Link
        href="/tickets"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All tickets
      </Link>

      <div className="mt-6 mb-2 flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate">
          {ticket.serviceType.replace("_", " ")} · {ticket.priority}
        </span>
        <span className="text-mid text-xs">·</span>
        <span className="text-mid text-xs">
          opened {datetime(ticket.createdAt)}
        </span>
      </div>
      <h1 className="text-2xl font-medium tracking-tight mb-6">
        {ticket.subject}
      </h1>

      <p className="text-sm text-light/90 whitespace-pre-wrap leading-relaxed mb-10">
        {ticket.body}
      </p>

      <div className="border border-charcoal bg-ink-2 p-5 mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-3">
          Status
        </p>
        <form action={changeStatus} className="flex items-center gap-3">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <select
            name="status"
            defaultValue={ticket.status}
            className="bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="text-[13px] tracking-wide px-4 py-2 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
          >
            Update
          </button>
          {ticket.slaDueAt && (
            <span className="ml-auto text-xs text-mid">
              SLA due {datetime(ticket.slaDueAt)}
            </span>
          )}
        </form>
      </div>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Comments
        </p>
        <div className="space-y-5">
          {comments.length === 0 && (
            <p className="text-mid text-sm">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-charcoal pl-4">
              <p className="text-xs text-mid mb-1">
                <span className="text-paper">
                  {c.authorName ?? c.authorEmail}
                </span>{" "}
                · {relativeTime(c.createdAt)}
              </p>
              <p className="text-sm text-light/90 whitespace-pre-wrap leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <form action={addComment} className="mt-8 space-y-3">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Add a comment..."
            className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
          />
          <button
            type="submit"
            className="text-[13px] tracking-wide px-4 py-2 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
          >
            Post comment
          </button>
        </form>
      </section>
    </div>
  );
}

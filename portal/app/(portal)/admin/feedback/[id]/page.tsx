import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeedbackDetail, updateFeedbackStatus, addFeedbackComment, convertToWorkOrder } from "../actions";
import { feedbackStatusEnum, workOrderPriorityEnum } from "@/db/schema";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getFeedbackDetail(id);
  if (!data) notFound();

  const { item, attachments, comments } = data;
  const canConvert = item.status !== "converted" && item.status !== "rejected";

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/feedback"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper transition-colors duration-150 ease-navon"
      >
        ← Feedback queue
      </Link>

      <h1 className="mt-4 text-2xl font-medium tracking-tight mb-1">{item.title}</h1>
      <p className="text-xs text-mid font-mono mb-8">
        {item.submitterName ?? item.submitterEmail} ·{" "}
        {item.createdAt.toLocaleDateString()} ·{" "}
        severity: <span className="text-paper">{item.severity}</span>
      </p>

      {/* Body */}
      <section className="mb-8 space-y-5">
        <Field label="What to change" value={item.description} />
        <Field label="Why" value={item.reason} />
        {item.url && <Field label="URL" value={item.url} mono />}
        {item.viewport && <Field label="Viewport" value={item.viewport} mono />}
        {item.userAgent && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-1">
              User agent
            </p>
            <p className="text-xs text-mid truncate">{item.userAgent}</p>
          </div>
        )}
      </section>

      {/* Attachments */}
      {attachments.length > 0 && (
        <section className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-3">
            Attachments
          </p>
          <div className="flex flex-wrap gap-3">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={`/api/feedback/attachments/${att.id}`}
                target="_blank"
                rel="noopener"
                className="border border-charcoal px-3 py-2 text-xs text-mid hover:text-paper hover:border-slate transition-colors duration-150"
              >
                {att.filename}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Status actions */}
      <section className="mb-10 border border-charcoal bg-ink-2 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Status · currently{" "}
          <span className="text-paper">{item.status}</span>
          {item.workOrderId && (
            <>
              {" "}→{" "}
              <Link
                href={`/admin/work-orders/${item.workOrderId}`}
                className="text-signal hover:underline"
              >
                work order
              </Link>
            </>
          )}
        </p>

        <form action={updateFeedbackStatus} className="flex flex-wrap items-end gap-3 mb-0">
          <input type="hidden" name="id" value={item.id} />
          <div>
            <label className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
              Set status
            </label>
            <select
              name="status"
              defaultValue={item.status}
              className="bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal"
            >
              {feedbackStatusEnum.enumValues.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
              Rejection reason (optional)
            </label>
            <input
              name="rejectionReason"
              defaultValue={item.rejectionReason ?? ""}
              className="w-full bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal transition-colors duration-150"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 border border-charcoal text-[13px] hover:border-paper transition-colors duration-150 ease-navon"
          >
            Update
          </button>
        </form>

        {/* Convert to work order */}
        {canConvert && (
          <details className="mt-5 border-t border-charcoal pt-5">
            <summary className="cursor-pointer text-[11px] font-mono uppercase tracking-[0.18em] text-mid hover:text-paper transition-colors duration-150 list-none">
              ▸ Convert to work order
            </summary>
            <form action={convertToWorkOrder} className="mt-4 space-y-3">
              <input type="hidden" name="feedbackId" value={item.id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block col-span-2">
                  <span className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
                    Work order title
                  </span>
                  <input
                    name="title"
                    required
                    defaultValue={item.title}
                    maxLength={160}
                    className="w-full bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal transition-colors duration-150"
                  />
                </label>
                <label className="block col-span-2">
                  <span className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
                    Description
                  </span>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    defaultValue={`${item.description}\n\n---\nReason: ${item.reason}`}
                    className="w-full bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal transition-colors duration-150 resize-y"
                  />
                </label>
                <label className="block">
                  <span className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
                    Priority
                  </span>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal"
                  >
                    {workOrderPriorityEnum.enumValues.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
                    Due date (optional)
                  </span>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal transition-colors duration-150"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-2.5 hover:opacity-90 transition-opacity duration-150"
              >
                Convert → Work order
              </button>
            </form>
          </details>
        )}
      </section>

      {/* Comments */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Comments ({comments.length})
        </p>
        <div className="space-y-5 mb-8">
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-charcoal pl-4">
              <p className="text-xs text-mid mb-1">
                {c.authorName ?? c.authorEmail} · {c.createdAt.toLocaleDateString()}
              </p>
              <p className="text-sm text-light/90 whitespace-pre-wrap leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-mid">No comments yet.</p>
          )}
        </div>

        <form action={addFeedbackComment} className="space-y-3">
          <input type="hidden" name="feedbackId" value={item.id} />
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Leave a comment for the submitter…"
            className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
          />
          <button
            type="submit"
            className="px-4 py-2 border border-charcoal text-[13px] hover:border-paper transition-colors duration-150 ease-navon"
          >
            Post comment
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-1.5">
        {label}
      </p>
      <p className={`text-sm text-light/90 whitespace-pre-wrap leading-relaxed ${mono ? "font-mono text-xs break-all" : ""}`}>
        {value}
      </p>
    </div>
  );
}

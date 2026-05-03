import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkOrderDetail, updateWorkOrder, addWorkOrderComment } from "../actions";
import { workOrderStatusEnum, workOrderPriorityEnum } from "@/db/schema";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getWorkOrderDetail(id);
  if (!data) notFound();

  const { item, comments, sourceFeedback } = data;

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/work-orders"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper transition-colors duration-150 ease-navon"
      >
        ← Work orders
      </Link>

      <h1 className="mt-4 text-2xl font-medium tracking-tight mb-1">{item.title}</h1>
      <p className="text-xs text-mid font-mono mb-8">
        Created {item.createdAt.toLocaleDateString()}
        {item.assigneeName && (
          <> · assigned to <span className="text-paper">{item.assigneeName}</span></>
        )}
        {sourceFeedback && (
          <>
            {" · "}
            <Link
              href={`/admin/feedback/${sourceFeedback.id}`}
              className="text-signal hover:underline"
            >
              from feedback
            </Link>
          </>
        )}
      </p>

      {/* Description */}
      <section className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-1.5">
          Description
        </p>
        <p className="text-sm text-light/90 whitespace-pre-wrap leading-relaxed">
          {item.description}
        </p>
      </section>

      {/* Update fields */}
      <section className="mb-10 border border-charcoal bg-ink-2 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
          Update
        </p>
        <form action={updateWorkOrder} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={item.id} />

          <div>
            <label className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
              Status
            </label>
            <select
              name="status"
              defaultValue={item.status}
              className="bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal"
            >
              {workOrderStatusEnum.enumValues.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
              Priority
            </label>
            <select
              name="priority"
              defaultValue={item.priority}
              className="bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal"
            >
              {workOrderPriorityEnum.enumValues.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-mono uppercase tracking-[0.14em] text-slate">
              Due date
            </label>
            <input
              type="date"
              name="dueDate"
              defaultValue={item.dueDate ?? ""}
              className="bg-ink border border-charcoal text-paper px-3 py-2 text-sm focus:outline-none focus:border-signal transition-colors duration-150"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 border border-charcoal text-[13px] hover:border-paper transition-colors duration-150 ease-navon"
          >
            Save
          </button>
        </form>
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

        <form action={addWorkOrderComment} className="space-y-3">
          <input type="hidden" name="workOrderId" value={item.id} />
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Add a comment…"
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

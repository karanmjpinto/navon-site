"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitFeedback, type SubmitState } from "@/app/(portal)/feedback/actions";

const SEVERITY = ["low", "medium", "high"] as const;

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitFeedback,
    null,
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem("fb-dismissed") === "1");
    }
  }, []);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      setOpen(false);
      setFileNames([]);
      setToast("Feedback submitted — thanks!");
      setTimeout(() => setToast(null), 4000);
    }
  }, [state]);

  function dismiss() {
    sessionStorage.setItem("fb-dismissed", "1");
    setDismissed(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave() {
    setDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dt = e.dataTransfer;
    if (fileInputRef.current && dt.files.length > 0) {
      fileInputRef.current.files = dt.files;
      setFileNames(Array.from(dt.files).map((f) => f.name));
    }
  }

  if (dismissed) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 z-40">
          <button
            onClick={dismiss}
            className="text-slate hover:text-mid transition-colors duration-150 text-[10px] font-mono uppercase tracking-[0.14em]"
            aria-label="Dismiss feedback button"
          >
            ✕
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-ink-2 border border-charcoal hover:border-signal text-paper text-[12px] font-mono uppercase tracking-[0.18em] px-4 py-2 transition-[border-color,color] duration-150 ease-navon shadow-lg"
          >
            <span className="inline-block w-1.5 h-1.5 bg-signal" aria-hidden />
            Feedback
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 bg-ink-2 border border-signal text-paper text-xs font-mono uppercase tracking-[0.18em] px-4 py-3">
          {toast}
        </div>
      )}

      {/* Modal backdrop + panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md bg-ink-2 border border-charcoal flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-signal" aria-hidden />
                Send feedback
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate hover:text-paper transition-colors duration-150 text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form action={action} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Auto-captured context — hidden */}
              <ContextCapture />

              <label className="block">
                <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
                  Title <span className="text-signal">*</span>
                </span>
                <input
                  name="title"
                  required
                  maxLength={160}
                  className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150"
                  placeholder="Brief description of the issue or idea"
                />
              </label>

              <label className="block">
                <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
                  What to change <span className="text-signal">*</span>
                </span>
                <textarea
                  name="description"
                  required
                  rows={3}
                  maxLength={4000}
                  className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 resize-y"
                  placeholder="Describe the current behaviour and what you'd change…"
                />
              </label>

              <label className="block">
                <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
                  Why <span className="text-signal">*</span>
                </span>
                <textarea
                  name="reason"
                  required
                  rows={2}
                  maxLength={4000}
                  className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 resize-y"
                  placeholder="Impact, frequency, urgency…"
                />
              </label>

              <label className="block">
                <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
                  Severity
                </span>
                <select
                  name="severity"
                  defaultValue="medium"
                  className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150"
                >
                  {SEVERITY.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              {/* Screenshot upload */}
              <div>
                <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
                  Screenshots (optional)
                </span>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed px-4 py-6 text-center cursor-pointer transition-[border-color] duration-150 ${
                    dragging ? "border-signal" : "border-charcoal hover:border-slate"
                  }`}
                >
                  <p className="text-xs text-mid">
                    {fileNames.length > 0
                      ? fileNames.join(", ")
                      : "Drag & drop or click to attach images / PDFs"}
                  </p>
                  <p className="text-[10px] text-slate mt-1">Max 10 MB per file</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="screenshots"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    setFileNames(
                      Array.from(e.target.files ?? []).map((f) => f.name),
                    )
                  }
                />
              </div>

              {state?.error && (
                <p className="text-xs text-signal">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full bg-signal text-ink font-medium text-[13px] tracking-wide py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px disabled:opacity-50"
              >
                {pending ? "Submitting…" : "Submit feedback"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Captures current URL, viewport, and UA into hidden form fields client-side.
function ContextCapture() {
  const [ctx, setCtx] = useState({ url: "", viewport: "", userAgent: "" });
  useEffect(() => {
    setCtx({
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
    });
  }, []);
  return (
    <>
      <input type="hidden" name="url" value={ctx.url} />
      <input type="hidden" name="viewport" value={ctx.viewport} />
      <input type="hidden" name="userAgent" value={ctx.userAgent} />
    </>
  );
}

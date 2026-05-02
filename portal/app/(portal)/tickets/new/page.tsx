import Link from "next/link";
import { createTicket } from "../actions";

const SERVICE_TYPES = [
  { value: "remote_hands", label: "Remote hands" },
  { value: "cross_connect", label: "Cross-connect" },
  { value: "cabinet", label: "Cabinet / space" },
  { value: "bandwidth", label: "Bandwidth change" },
  { value: "ip_management", label: "IP / network" },
  { value: "other", label: "Other" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High (8h SLA)" },
  { value: "urgent", label: "Urgent (2h SLA)" },
] as const;

export default function NewTicketPage() {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
        New service request
      </p>
      <h1 className="text-3xl font-medium tracking-tight mb-10">
        Raise a ticket
      </h1>

      <form action={createTicket} className="space-y-6">
        <Field label="Subject" name="subject" required />

        <label className="block">
          <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
            Description
          </span>
          <textarea
            name="body"
            required
            rows={6}
            className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Service type" name="serviceType" options={SERVICE_TYPES} defaultValue="remote_hands" />
          <Select label="Priority" name="priority" options={PRIORITIES} defaultValue="normal" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
          >
            Submit request
          </button>
          <Link href="/tickets" className="text-mid hover:text-paper text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <input
        name={name}
        required={required}
        className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

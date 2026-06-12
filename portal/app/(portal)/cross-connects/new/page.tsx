import Link from "next/link";
import { getCabinetOptions, requestCrossConnect } from "../actions";

const CONNECTION_TYPES = [
  { value: "cloud", label: "Cloud on-ramp (AWS / Azure / Google)" },
  { value: "carrier", label: "Carrier / ISP uplink" },
  { value: "customer", label: "Customer / partner / peer" },
  { value: "internal", label: "Internal (cabinet-to-cabinet)" },
  { value: "ix", label: "Internet Exchange (KIXP) peering" },
] as const;

const MEDIA = [
  { value: "fiber_sm", label: "Single-mode fibre" },
  { value: "fiber_mm", label: "Multi-mode fibre" },
  { value: "copper", label: "Copper" },
] as const;

const SPEEDS = [
  { value: "1", label: "1 Gbps" },
  { value: "10", label: "10 Gbps" },
  { value: "25", label: "25 Gbps" },
  { value: "40", label: "40 Gbps" },
  { value: "100", label: "100 Gbps" },
] as const;

export default async function NewCrossConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cabinets = await getCabinetOptions();

  return (
    <div className="max-w-2xl">
      <Link
        href="/cross-connects"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← All cross-connects
      </Link>

      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mt-6 mb-3">
        New interconnect request
      </p>
      <h1 className="text-3xl font-medium tracking-tight mb-3">
        Request a cross-connect
      </h1>
      <p className="text-mid text-sm mb-10 max-w-xl">
        A cross-connect is a dedicated fibre or copper link from one of your
        cabinets to a counterparty inside the facility. Our team patches the
        physical path and confirms it live, usually within one business day.
      </p>

      {error === "invalid" && (
        <div className="border border-signal/40 bg-signal/10 text-paper text-sm px-4 py-3 mb-6">
          Please check the form — a required field was missing or invalid.
        </div>
      )}

      {cabinets.length === 0 ? (
        <div className="border border-dashed border-charcoal p-10 text-center text-mid text-sm">
          You have no active cabinets to originate a cross-connect from. Contact
          your account manager to provision cabinet space first.
        </div>
      ) : (
        <form action={requestCrossConnect} className="space-y-6">
          <Select
            label="A-side — your cabinet"
            name="fromCabinetId"
            options={cabinets.map((c) => ({
              value: c.id,
              label: `${c.label}${c.siteCode ? ` · ${c.siteCode}` : ""}`,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Connection type"
              name="connectionType"
              options={CONNECTION_TYPES}
              defaultValue="carrier"
            />
            <Field
              label="Counterparty / provider"
              name="zSideProvider"
              placeholder="e.g. AWS, Safaricom, Liquid"
            />
          </div>

          <Field
            label="Z-side demarcation"
            name="toLabel"
            required
            placeholder="e.g. MMR rack 3, port 12"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Port speed"
              name="speedGbps"
              options={SPEEDS}
              defaultValue="10"
            />
            <Select
              label="Media"
              name="media"
              options={MEDIA}
              defaultValue="fiber_sm"
            />
          </div>

          <label className="block">
            <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
              Notes (optional)
            </span>
            <textarea
              name="notes"
              rows={4}
              placeholder="LOA/CFA reference, requested timing, redundancy requirements…"
              className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
            />
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
            >
              Submit request
            </button>
            <Link
              href="/cross-connects"
              className="text-mid hover:text-paper text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
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

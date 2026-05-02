// Shared form/UI primitives — reused across the new pages added in
// the second build pass. Earlier pages have local copies; converging
// them is on the cleanup list but not load-bearing.

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
      {children}
    </p>
  );
}

export function PageTitle({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-10">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        {sub && <p className="text-mid text-sm mt-2 max-w-xl">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  children,
  actions,
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate">
              {title}
            </p>
          )}
          {actions}
        </div>
      )}
      <div className="border border-charcoal bg-ink-2 p-6">{children}</div>
    </section>
  );
}

export function PrimaryButton({
  children,
  type = "submit",
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  type = "submit",
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      className="text-[13px] tracking-wide px-4 py-2 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  autoComplete,
  inputMode,
  pattern,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email" | "tel";
  pattern?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        placeholder={placeholder}
        className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  rows = 4,
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
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

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-charcoal p-12 text-center text-mid text-sm">
      {children}
    </div>
  );
}

export function Chip({
  tone = "default",
  children,
}: {
  tone?: "default" | "signal" | "paper" | "danger" | "muted";
  children: React.ReactNode;
}) {
  const styles = {
    default: "bg-ink-2 text-mid border border-charcoal",
    signal: "bg-signal text-ink",
    paper: "bg-paper text-ink",
    danger: "bg-red-500/30 text-red-200 border border-red-500/40",
    muted: "bg-charcoal text-paper",
  } as const;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.14em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

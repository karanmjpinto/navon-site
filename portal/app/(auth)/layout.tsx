export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-between">
          <a
            href="https://navonworld.com"
            className="font-mono text-sm font-medium uppercase tracking-[0.22em] text-paper hover:text-paper/80 transition-colors duration-150"
          >
            NAVON<span className="text-signal">.</span>
          </a>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-mid">
            Customer portal
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

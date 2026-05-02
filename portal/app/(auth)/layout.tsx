export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3">
          <span className="inline-block h-2 w-2 bg-signal" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid">
            Navon Portal
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

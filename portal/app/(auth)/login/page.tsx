import Link from "next/link";
import { signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    error?: string;
    password?: string;
  }>;
}) {
  const sp = await searchParams;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-medium tracking-tight">Sign in</h1>
      <p className="mb-8 text-sm text-mid">
        Access your data centre dashboard.
      </p>

      {sp.password === "changed" && (
        <p className="mb-4 text-xs text-signal">
          ✓ Password changed. Sign in again.
        </p>
      )}

      <form action={signInWithCredentials} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="Authenticator code (if 2FA enabled)"
          name="totp"
          autoComplete="one-time-code"
          inputMode="numeric"
        />
        {sp.error && (
          <p className="text-xs text-signal">
            We couldn't sign you in. Check your details and try again.
          </p>
        )}
        <button
          type="submit"
          className="w-full bg-signal text-ink font-medium text-[13px] tracking-wide py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
        >
          Continue
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[11px] text-mid font-mono uppercase tracking-[0.24em]">
        <span className="h-px flex-1 bg-charcoal" />
        or
        <span className="h-px flex-1 bg-charcoal" />
      </div>

      <form action={signInWithMagicLink} className="space-y-4">
        <Field label="Magic link to email" name="email" type="email" required />
        <button
          type="submit"
          className="w-full border border-charcoal text-paper font-medium text-[13px] tracking-wide py-3 transition-[border-color,background] duration-150 ease-navon hover:border-paper"
        >
          Email me a sign-in link
        </button>
      </form>

      <p className="mt-8 text-xs text-mid">
        New to Navon?{" "}
        <Link href="/signup" className="text-paper underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}

async function signInWithCredentials(formData: FormData) {
  "use server";
  await signIn("credentials", {
    email: formData.get("email"),
    password: formData.get("password"),
    totp: formData.get("totp"),
    redirectTo: "/dashboard",
  });
}

async function signInWithMagicLink(formData: FormData) {
  "use server";
  await signIn("resend", {
    email: formData.get("email"),
    redirectTo: "/dashboard",
  });
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  inputMode,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email";
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
      />
    </label>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { provisioningQrDataUrl, provisioningUri } from "@/lib/totp";
import { confirmMfa } from "../actions";

const MFA_COOKIE = "mfa_setup_secret";

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const c = await cookies();
  const secret = c.get(MFA_COOKIE)?.value;
  if (!secret) {
    redirect("/settings");
  }

  const label = session?.user?.email ?? "navon";
  const qr = await provisioningQrDataUrl(secret, label);
  const uri = provisioningUri(secret, label);
  const sp = await searchParams;

  return (
    <div className="max-w-md">
      <Link
        href="/settings"
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← Settings
      </Link>

      <h1 className="mt-6 text-2xl font-medium tracking-tight mb-2">
        Set up two-factor
      </h1>
      <p className="text-mid text-sm mb-8">
        Scan this QR code with your authenticator app, then enter the 6-digit
        code it shows.
      </p>

      <div className="border border-charcoal bg-paper p-4 inline-block mb-4">
        {/* Data-URL PNG; renders identically client- and server-side */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="2FA QR code" width={220} height={220} />
      </div>
      <details className="mb-8">
        <summary className="text-xs text-mid cursor-pointer">
          Can't scan? Enter the secret manually
        </summary>
        <p className="font-mono text-xs mt-2 break-all text-light">{secret}</p>
        <p className="font-mono text-[10px] mt-2 break-all text-mid">{uri}</p>
      </details>

      <form action={confirmMfa} className="space-y-4">
        <label className="block">
          <span className="block mb-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-slate">
            6-digit code
          </span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            required
            className="w-40 bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-lg tracking-[0.4em] font-mono focus:outline-none focus:border-signal"
          />
        </label>
        {sp.error === "invalid" && (
          <p className="text-xs text-signal">
            Code didn't match. Try again with a fresh code.
          </p>
        )}
        {sp.error === "expired" && (
          <p className="text-xs text-signal">
            Setup expired. Start again from Settings.
          </p>
        )}
        <button
          type="submit"
          className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
        >
          Verify and enable
        </button>
      </form>
    </div>
  );
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  updateProfile,
  changePassword,
  startMfaSetup,
  disableMfa,
} from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mfa?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const sp = await searchParams;

  return (
    <div className="max-w-2xl space-y-12">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mid mb-3">
          Account
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
      </div>

      {/* Profile ──────────────────────────────────────────────── */}
      <Card title="Profile">
        <form action={updateProfile} className="space-y-4">
          <Field
            label="Full name"
            name="name"
            defaultValue={u?.name ?? ""}
            required
          />
          <p className="text-xs text-mid">
            Email: <span className="text-paper">{u?.email}</span>
          </p>
          <PrimaryButton>Save</PrimaryButton>
        </form>
      </Card>

      {/* Password ─────────────────────────────────────────────── */}
      <Card title="Password">
        <form action={changePassword} className="space-y-4">
          <Field label="Current password" name="current" type="password" required />
          <Field
            label="New password (min 8 chars)"
            name="next"
            type="password"
            required
          />
          {sp.error === "password_current" && (
            <p className="text-xs text-signal">
              Current password is incorrect.
            </p>
          )}
          {sp.error === "password_format" && (
            <p className="text-xs text-signal">
              New password must be at least 8 characters.
            </p>
          )}
          <PrimaryButton>Change password</PrimaryButton>
        </form>
      </Card>

      {/* MFA ──────────────────────────────────────────────────── */}
      <Card title="Two-factor authentication">
        {u?.totpEnabled ? (
          <form action={disableMfa} className="space-y-4">
            <p className="text-sm text-mid">
              Authenticator app is{" "}
              <span className="text-signal">enabled</span>. To disable, enter
              your current 6-digit code.
            </p>
            <Field label="Authenticator code" name="code" required />
            {sp.error === "mfa_invalid" && (
              <p className="text-xs text-signal">Invalid code.</p>
            )}
            <button
              type="submit"
              className="text-[13px] tracking-wide px-5 py-3 border border-charcoal hover:border-paper transition-colors duration-150 ease-navon"
            >
              Disable 2FA
            </button>
          </form>
        ) : (
          <form action={startMfaSetup} className="space-y-4">
            <p className="text-sm text-mid">
              Add an authenticator app (1Password, Authy, Google Authenticator,
              etc.) for a second factor on every sign-in. Strongly recommended.
            </p>
            <PrimaryButton>Set up 2FA</PrimaryButton>
          </form>
        )}
        {sp.mfa === "enabled" && (
          <p className="mt-3 text-xs text-signal">
            ✓ Two-factor authentication is now enabled.
          </p>
        )}
        {sp.mfa === "disabled" && (
          <p className="mt-3 text-xs text-mid">
            Two-factor authentication has been turned off.
          </p>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate mb-4">
        {title}
      </p>
      <div className="border border-charcoal bg-ink-2 p-6">{children}</div>
    </section>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        required={required}
        className="w-full bg-ink border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
      />
    </label>
  );
}

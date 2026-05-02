import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users, orgs, memberships } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(1).max(120),
  orgName: z.string().min(1).max(120),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
});

export default function SignupPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-medium tracking-tight">
        Create account
      </h1>
      <p className="mb-8 text-sm text-mid">
        Self-serve signup for early access. Your team admin can invite others
        once you're in.
      </p>

      <form action={signup} className="space-y-4">
        <Field label="Full name" name="name" autoComplete="name" required />
        <Field label="Organisation" name="orgName" required />
        <Field label="Work email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-mid">Minimum 8 characters.</p>
        <button
          type="submit"
          className="w-full bg-signal text-ink font-medium text-[13px] tracking-wide py-3 transition-[transform,opacity] duration-150 ease-navon hover:opacity-90 active:translate-y-px"
        >
          Create account
        </button>
      </form>

      <p className="mt-8 text-xs text-mid">
        Already have an account?{" "}
        <Link href="/login" className="text-paper underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

async function signup(formData: FormData) {
  "use server";

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    orgName: formData.get("orgName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect("/signup?error=invalid");
  }
  const { name, orgName, email, password } = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    redirect("/signup?error=exists");
  }

  const passwordHash = await hashPassword(password);
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(orgs)
      .values({ name: orgName, slug: `${slug}-${Date.now().toString(36)}` })
      .returning();
    const [user] = await tx
      .insert(users)
      .values({ name, email, passwordHash })
      .returning();
    await tx.insert(memberships).values({
      userId: user.id,
      orgId: org.id,
      role: "admin",
    });
  });

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
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
        required={required}
        className="w-full bg-ink-2 border border-charcoal text-paper px-3 py-2.5 text-sm focus:outline-none focus:border-signal transition-colors duration-150 ease-navon"
      />
    </label>
  );
}

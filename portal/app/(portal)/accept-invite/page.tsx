import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { redeemInvite } from "../settings/team/actions";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token;
  if (!token) redirect("/dashboard");

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?from=/accept-invite?token=${encodeURIComponent(token)}`);
  }

  const orgId = await redeemInvite(token, session.user.id);

  return (
    <div className="max-w-md">
      {orgId ? (
        <>
          <h1 className="text-2xl font-medium tracking-tight mb-2">
            Invite accepted
          </h1>
          <p className="text-mid text-sm mb-6">
            Welcome to your new team workspace.
          </p>
          <Link
            href="/dashboard"
            className="bg-signal text-ink font-medium text-[13px] tracking-wide px-5 py-3 inline-block transition-[transform,opacity] duration-150 ease-navon hover:opacity-90"
          >
            Continue to dashboard
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-medium tracking-tight mb-2">
            Invite invalid
          </h1>
          <p className="text-mid text-sm mb-6">
            This invite has expired, been revoked, or doesn't match your
            email. Ask your admin for a new one.
          </p>
          <Link
            href="/dashboard"
            className="text-mid hover:text-paper text-sm"
          >
            ← Back to dashboard
          </Link>
        </>
      )}
    </div>
  );
}

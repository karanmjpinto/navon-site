import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { invoices } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { Card, Field, PrimaryButton, Eyebrow } from "@/components/forms";
import { money } from "@/lib/format";
import { initiateMpesa } from "./actions";

export default async function PayInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { orgId } = await requireSession();

  const inv = await withOrgContext(orgId, async (tx) => {
    const [row] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
      .limit(1);
    return row ?? null;
  });

  if (!inv) notFound();

  return (
    <div className="max-w-md">
      <Link
        href={`/billing/${inv.id}`}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← Invoice {inv.number}
      </Link>

      <div className="mt-6 mb-8">
        <Eyebrow>Pay with M-Pesa</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight mb-2">
          {money(inv.totalMinor, inv.currency)}
        </h1>
        <p className="text-mid text-sm">
          Enter the Safaricom phone to charge. You'll receive an STK push
          prompt; approve it on your phone to complete payment.
        </p>
      </div>

      <Card>
        <form action={initiateMpesa} className="space-y-4">
          <input type="hidden" name="invoiceId" value={inv.id} />
          <Field
            label="Phone (07XX or 2547XX)"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712345678"
            required
          />
          {sp.error === "phone" && (
            <p className="text-xs text-signal">
              That number doesn't look right. Use 07XXXXXXXX or 2547XXXXXXXX.
            </p>
          )}
          <PrimaryButton>Send STK push</PrimaryButton>
        </form>
      </Card>

      <p className="mt-4 text-xs text-mid">
        Daraja sandbox/production credentials are wired in Phase 2; for now
        this records the intent and returns to a pending screen.
      </p>
    </div>
  );
}

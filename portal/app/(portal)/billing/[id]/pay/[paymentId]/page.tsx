import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { mpesaPayments } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { Eyebrow, Chip } from "@/components/forms";
import { money, datetime } from "@/lib/format";

const STATUS_TONE = {
  initiated: "paper",
  pending: "paper",
  success: "signal",
  failed: "danger",
} as const;

export default async function PaymentStatusPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = await params;
  const { orgId } = await requireSession();

  const pay = await withOrgContext(orgId, async (tx) => {
    const [row] = await tx
      .select()
      .from(mpesaPayments)
      .where(
        and(
          eq(mpesaPayments.id, paymentId),
          eq(mpesaPayments.orgId, orgId),
          eq(mpesaPayments.invoiceId, id),
        ),
      )
      .limit(1);
    return row ?? null;
  });

  if (!pay) notFound();

  return (
    <div className="max-w-md">
      <Link
        href={`/billing/${id}`}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mid hover:text-paper"
      >
        ← Invoice
      </Link>

      <div className="mt-6 mb-6">
        <Eyebrow>M-Pesa payment</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight mb-2">
          {money(pay.amountMinor, "KES")}
        </h1>
        <p className="text-mid text-sm">to {pay.phone}</p>
      </div>

      <div className="border border-charcoal bg-ink-2 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-slate">
            Status
          </span>
          <Chip tone={STATUS_TONE[pay.status]}>{pay.status}</Chip>
        </div>
        <div className="flex items-center justify-between text-xs text-mid">
          <span>Initiated</span>
          <span>{datetime(pay.createdAt)}</span>
        </div>
        {pay.completedAt && (
          <div className="flex items-center justify-between text-xs text-mid">
            <span>Completed</span>
            <span>{datetime(pay.completedAt)}</span>
          </div>
        )}
        {pay.darajaResultDesc && (
          <p className="text-xs text-mid pt-2 border-t border-charcoal">
            {pay.darajaResultDesc}
          </p>
        )}
      </div>

      {pay.status === "initiated" && (
        <p className="mt-4 text-xs text-mid">
          In production, this page polls or receives a webhook from Daraja and
          updates the status automatically. For now it stays in "initiated"
          until the callback hits <code>/api/payments/mpesa/callback</code>.
        </p>
      )}
    </div>
  );
}

"use server";

import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invoices, mpesaPayments } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";

const initSchema = z.object({
  invoiceId: z.string().uuid(),
  // Accept Kenyan formats: 07XXXXXXXX, 254XXXXXXXXX, +254XXXXXXXXX
  phone: z.string().regex(/^(\+?254|0)\d{9}$/),
});

function normalisePhone(p: string): string {
  if (p.startsWith("+254")) return p.slice(1);
  if (p.startsWith("254")) return p;
  if (p.startsWith("0")) return `254${p.slice(1)}`;
  return p;
}

export async function initiateMpesa(formData: FormData) {
  const ctx = await requireSession();
  const parsed = initSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    phone: (formData.get("phone") as string | null)?.replace(/\s+/g, ""),
  });
  if (!parsed.success) {
    redirect(`/billing/${formData.get("invoiceId")}/pay?error=phone`);
  }

  const created = await withOrgContext(ctx.orgId, async (tx) => {
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, parsed.data.invoiceId),
          eq(invoices.orgId, ctx.orgId),
        ),
      )
      .limit(1);
    if (!inv || inv.status === "paid") return null;
    const [row] = await tx
      .insert(mpesaPayments)
      .values({
        orgId: ctx.orgId,
        invoiceId: inv.id,
        phone: normalisePhone(parsed.data.phone),
        amountMinor: inv.totalMinor,
        status: "initiated",
      })
      .returning();
    return row;
  });

  if (!created) {
    redirect(`/billing/${parsed.data.invoiceId}?error=cannot_pay`);
  }

  await recordAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "mpesa.initiate",
    targetType: "invoice",
    targetId: parsed.data.invoiceId,
    metadata: { phone: created.phone },
  });

  // In Phase 2 we'd call Daraja STK Push here:
  //   POST https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
  //   { BusinessShortCode, Password, Timestamp, TransactionType, Amount,
  //     PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
  //     CallBackURL: https://portal.navonworld.com/api/payments/mpesa/callback,
  //     AccountReference: inv.number, TransactionDesc: "Navon billing" }
  // The CheckoutRequestID returned would be saved to darajaCheckoutId.

  redirect(`/billing/${parsed.data.invoiceId}/pay/${created.id}`);
}

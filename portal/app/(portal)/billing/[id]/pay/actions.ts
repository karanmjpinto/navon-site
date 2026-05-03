"use server";

import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invoices, mpesaPayments } from "@/db/schema";
import { requireSession, withOrgContext } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { initiateStkPush, darajaConfigured } from "@/lib/daraja";

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
        orgId:       ctx.orgId,
        invoiceId:   inv.id,
        phone:       normalisePhone(parsed.data.phone),
        amountMinor: inv.totalMinor,
        status:      "initiated",
      })
      .returning();
    return { row, inv };
  });

  if (!created) {
    redirect(`/billing/${parsed.data.invoiceId}?error=cannot_pay`);
  }

  await recordAudit({
    orgId:      ctx.orgId,
    userId:     ctx.userId,
    action:     "mpesa.initiate",
    targetType: "invoice",
    targetId:   parsed.data.invoiceId,
    metadata:   { phone: created.row.phone },
  });

  // Call Daraja STK Push when credentials are present.
  // Falls through to the pending page if they're not (e.g. local dev).
  if (darajaConfigured()) {
    const result = await initiateStkPush({
      phone:       created.row.phone,
      amountKes:   Math.ceil(created.inv.totalMinor / 100),
      accountRef:  created.inv.number,
      description: "Navon billing",
    });

    if (result.ok) {
      await db
        .update(mpesaPayments)
        .set({
          status:            "pending",
          darajaCheckoutId:  result.checkoutRequestId,
          darajaRequestId:   result.merchantRequestId,
        })
        .where(eq(mpesaPayments.id, created.row.id));
    } else {
      // STK push failed — log but don't crash. The operator can manually
      // reconcile. The row stays in "initiated" state and the customer
      // lands on the pending page with a note.
      console.error(
        "[daraja] STK push failed",
        result.errorCode,
        result.errorMessage,
      );
      await recordAudit({
        orgId:      ctx.orgId,
        userId:     ctx.userId,
        action:     "mpesa.stk_failed",
        targetType: "invoice",
        targetId:   parsed.data.invoiceId,
        metadata:   { code: result.errorCode, msg: result.errorMessage },
      });
    }
  }

  redirect(`/billing/${parsed.data.invoiceId}/pay/${created.row.id}`);
}

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mpesaPayments, invoices } from "@/db/schema";

// Daraja STK push callback. Safaricom POSTs JSON when the customer
// approves or rejects the prompt. Source IPs documented at
// https://developer.safaricom.co.ke — restrict at Caddy in production.
//
// Body shape (abridged):
//   {
//     "Body": {
//       "stkCallback": {
//         "MerchantRequestID": "...",
//         "CheckoutRequestID": "ws_CO_...",
//         "ResultCode": 0,
//         "ResultDesc": "The service request is processed successfully.",
//         "CallbackMetadata": { "Item": [...] }
//       }
//     }
//   }
//
// We look up our payment row by CheckoutRequestID, mark success/fail,
// and (on success) flip the invoice to paid.

const callbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string().optional(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
    }),
  }),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) return new Response("bad shape", { status: 400 });

  const { CheckoutRequestID, ResultCode, ResultDesc } =
    parsed.data.Body.stkCallback;

  const [pay] = await db
    .select()
    .from(mpesaPayments)
    .where(eq(mpesaPayments.darajaCheckoutId, CheckoutRequestID))
    .limit(1);
  if (!pay) {
    // Not our payment, or our row was deleted. Acknowledge so Safaricom
    // stops retrying.
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "ok" }), {
      headers: { "content-type": "application/json" },
    });
  }

  const success = ResultCode === 0;
  await db
    .update(mpesaPayments)
    .set({
      status: success ? "success" : "failed",
      darajaResultCode: ResultCode,
      darajaResultDesc: ResultDesc,
      completedAt: new Date(),
    })
    .where(eq(mpesaPayments.id, pay.id));

  if (success) {
    await db
      .update(invoices)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(invoices.id, pay.invoiceId));
  }

  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "ok" }), {
    headers: { "content-type": "application/json" },
  });
}

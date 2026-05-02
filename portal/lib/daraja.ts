// Safaricom Daraja API — M-Pesa STK Push (Lipa Na M-Pesa Online)
//
// Required env vars:
//   DARAJA_CONSUMER_KEY      — from Safaricom Developer portal
//   DARAJA_CONSUMER_SECRET   — from Safaricom Developer portal
//   DARAJA_SHORTCODE         — Business Short Code (till or paybill number)
//   DARAJA_PASSKEY           — Lipa Na M-Pesa Online passkey
//   DARAJA_CALLBACK_URL      — full URL: https://portal.navonworld.com/api/payments/mpesa/callback
//   DARAJA_SANDBOX           — set to "true" for sandbox (omit in production)

const BASE = process.env.DARAJA_SANDBOX === "true"
  ? "https://sandbox.safaricom.co.ke"
  : "https://api.safaricom.co.ke";

async function getOAuthToken(): Promise<string> {
  const key    = process.env.DARAJA_CONSUMER_KEY!;
  const secret = process.env.DARAJA_CONSUMER_SECRET!;
  const creds  = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(
    `${BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } },
  );
  if (!res.ok) {
    throw new Error(`Daraja OAuth failed: ${res.status} ${await res.text()}`);
  }
  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}

function buildPassword(shortCode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14); // YYYYMMDDHHmmss
}

export type StkPushResult =
  | { ok: true;  checkoutRequestId: string; merchantRequestId: string }
  | { ok: false; errorCode: string; errorMessage: string };

export async function initiateStkPush(args: {
  phone: string;        // 254XXXXXXXXX format
  amountKes: number;    // whole shillings — Daraja rejects decimals
  accountRef: string;   // invoice number shown on customer's phone
  description: string;
}): Promise<StkPushResult> {
  const shortCode   = process.env.DARAJA_SHORTCODE!;
  const passkey     = process.env.DARAJA_PASSKEY!;
  const callbackUrl = process.env.DARAJA_CALLBACK_URL
    ?? `${process.env.AUTH_URL}/api/payments/mpesa/callback`;

  const ts       = timestamp();
  const password = buildPassword(shortCode, passkey, ts);
  const token    = await getOAuthToken();

  const body = {
    BusinessShortCode: shortCode,
    Password:          password,
    Timestamp:         ts,
    TransactionType:   "CustomerPayBillOnline",
    Amount:            Math.ceil(args.amountKes),
    PartyA:            args.phone,
    PartyB:            shortCode,
    PhoneNumber:       args.phone,
    CallBackURL:       callbackUrl,
    AccountReference:  args.accountRef.slice(0, 12),
    TransactionDesc:   args.description.slice(0, 13),
  };

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as Record<string, string>;

  if (!res.ok || json.ResponseCode !== "0") {
    return {
      ok:           false,
      errorCode:    json.ResponseCode   ?? String(res.status),
      errorMessage: json.ResponseDescription ?? json.errorMessage ?? "STK push failed",
    };
  }

  return {
    ok:                true,
    checkoutRequestId: json.CheckoutRequestID,
    merchantRequestId: json.MerchantRequestID,
  };
}

// Check if Daraja credentials are configured.
export function darajaConfigured(): boolean {
  return !!(
    process.env.DARAJA_CONSUMER_KEY &&
    process.env.DARAJA_CONSUMER_SECRET &&
    process.env.DARAJA_SHORTCODE &&
    process.env.DARAJA_PASSKEY
  );
}

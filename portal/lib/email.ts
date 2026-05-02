// Thin wrapper around the Resend HTTPS API. Used for invite emails,
// alert notifications, and other transactional mail.
//
// Graceful behaviour: if AUTH_RESEND_KEY is unset, log to console
// instead of erroring. This keeps local dev working without Resend
// while making the same call sites future-proof.

type SendArgs = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string }> {
  const key = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM ?? "Navon <noreply@localhost>";
  if (!key || key.startsWith("re_test_")) {
    // Local dev — print and pretend.
    console.log(
      `[email:mock] to=${[args.to].flat().join(",")} subject="${args.subject}"\n${args.text}`,
    );
    return { ok: true, id: "mock" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html ?? args.text.replace(/\n/g, "<br>"),
      reply_to: args.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email] resend send failed", res.status, body);
    return { ok: false };
  }
  const json = (await res.json()) as { id?: string };
  return { ok: true, id: json.id };
}

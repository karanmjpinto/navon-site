// POST /api/auth/saml/callback  (ACS — Assertion Consumer Service)
//
// The IdP POSTs the SAML response here after the user authenticates.
// We validate the assertion, find-or-create the portal user, mint an
// Auth.js-compatible JWT session, set the session cookie, and redirect
// to /dashboard.

import { redirect } from "next/navigation";
import { encode } from "next-auth/jwt";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, memberships } from "@/db/schema";
import { getSamlClient, samlConfigured, extractUserProfile } from "@/lib/saml";
import { recordAudit } from "@/lib/audit";

// Auth.js v5 uses the cookie name as the JWT salt.
// Production Next.js sets __Secure- prefix on HTTPS; dev uses plain name.
function sessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export async function POST(req: Request) {
  if (!samlConfigured()) {
    return new Response("SAML not configured", { status: 404 });
  }

  let body: URLSearchParams;
  try {
    const text = await req.text();
    body = new URLSearchParams(text);
  } catch {
    return new Response("invalid body", { status: 400 });
  }

  const samlResponse = body.get("SAMLResponse");
  if (!samlResponse) {
    return new Response("missing SAMLResponse", { status: 400 });
  }

  // Validate the assertion.
  let profile: Record<string, unknown>;
  try {
    const saml = getSamlClient();
    const result = await saml.validatePostResponse({
      SAMLResponse: samlResponse,
    });
    profile = result.profile as Record<string, unknown>;
  } catch (err) {
    console.error("[saml] assertion validation failed", err);
    return new Response("SAML assertion invalid", { status: 401 });
  }

  let userProfile: { email: string; name: string | null; nameId: string };
  try {
    userProfile = extractUserProfile(profile);
  } catch (err) {
    console.error("[saml] profile extraction failed", err);
    return Response.redirect(
      `${process.env.AUTH_URL ?? ""}/login?error=saml_profile`,
    );
  }

  // Find or create the portal user.
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, userProfile.email))
    .limit(1);

  if (!user) {
    // Auto-provision. The org assignment is handled separately by an admin
    // invite — a SAML user without an org lands on /dashboard and sees
    // a "contact your administrator" message from the tenant guard.
    const [created] = await db
      .insert(users)
      .values({
        email:         userProfile.email,
        name:          userProfile.name,
        emailVerified: new Date(),
      })
      .returning();
    user = created;
  } else if (userProfile.name && user.name !== userProfile.name) {
    // Keep the display name in sync with the IdP.
    await db
      .update(users)
      .set({ name: userProfile.name })
      .where(eq(users.id, user.id));
    user = { ...user, name: userProfile.name };
  }

  // Resolve org (may be null for freshly provisioned users).
  const [membership] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);

  await recordAudit({
    orgId:      membership?.orgId ?? null,
    userId:     user.id,
    action:     "auth.saml_login",
    metadata:   { nameId: userProfile.nameId },
  });

  // Mint an Auth.js JWT session token.
  const cookieName = sessionCookieName();
  const token = await encode({
    token: {
      sub:   user.id,
      email: user.email,
      name:  user.name ?? undefined,
    },
    secret: process.env.AUTH_SECRET!,
    salt:   cookieName,
  });

  const isSecure  = process.env.NODE_ENV === "production";
  const maxAge    = 30 * 24 * 3600; // 30 days — matches Auth.js default
  const cookieVal =
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` +
    (isSecure ? "; Secure" : "");

  return new Response(null, {
    status: 302,
    headers: {
      Location:   "/dashboard",
      "Set-Cookie": cookieVal,
    },
  });
}

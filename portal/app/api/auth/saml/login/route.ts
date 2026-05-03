// GET /api/auth/saml/login
// Initiates the SAML SSO flow: generates a signed AuthnRequest and
// redirects the browser to the IdP's HTTP-Redirect binding endpoint.
//
// The login page links to this endpoint via a "Sign in with university SSO"
// button that is rendered only when SAML_IDP_SSO_URL is set.

import { getSamlClient, samlConfigured } from "@/lib/saml";

export async function GET() {
  if (!samlConfigured()) {
    return new Response("SAML not configured", { status: 404 });
  }
  try {
    const saml = getSamlClient();
    const url  = await saml.getAuthorizeUrl({});
    return new Response(null, { status: 302, headers: { Location: url } });
  } catch (err) {
    console.error("[saml] login redirect failed", err);
    return new Response("SSO initiation failed", { status: 500 });
  }
}

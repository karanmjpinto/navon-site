// GET /api/auth/saml/metadata
// Returns the SP metadata XML. Give this URL to the university IdP admin
// so they can register Navon Portal as a Service Provider.

import { getSamlClient, samlConfigured } from "@/lib/saml";

export async function GET() {
  if (!samlConfigured()) {
    return new Response("SAML not configured", { status: 404 });
  }
  try {
    const saml = getSamlClient();
    const xml = await saml.generateServiceProviderMetadata(null, null);
    return new Response(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (err) {
    console.error("[saml] metadata generation failed", err);
    return new Response("metadata error", { status: 500 });
  }
}

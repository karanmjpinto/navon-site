// SAML 2.0 Service-Provider helpers wrapping node-saml.
//
// Required env vars (set when the first university customer onboards):
//   SAML_IDP_ENTITY_ID   — IdP entityID from federation metadata
//   SAML_IDP_SSO_URL     — IdP HTTP-Redirect binding SSO URL
//   SAML_IDP_CERT        — IdP X.509 signing cert, base64-DER (no PEM headers/footers)
//
// Optional:
//   SAML_SP_ENTITY_ID    — defaults to AUTH_URL + "/api/auth/saml/metadata"
//   SAML_WANT_ASSERTIONS_SIGNED — "false" to skip assertion sig check (not recommended)

import { SAML } from "node-saml";
import type { SamlConfig } from "node-saml";

function ensurePemCert(raw: string): string {
  const stripped = raw.replace(/\s/g, "");
  if (stripped.startsWith("-----")) return raw;
  return `-----BEGIN CERTIFICATE-----\n${stripped}\n-----END CERTIFICATE-----`;
}

export function getSamlConfig(): SamlConfig {
  const base = process.env.AUTH_URL ?? "http://localhost:3002";
  const spEntityId =
    process.env.SAML_SP_ENTITY_ID ?? `${base}/api/auth/saml/metadata`;

  const idpCert = process.env.SAML_IDP_CERT;
  if (!idpCert) throw new Error("SAML_IDP_CERT is required");

  return {
    callbackUrl:            `${base}/api/auth/saml/callback`,
    entryPoint:             process.env.SAML_IDP_SSO_URL!,
    issuer:                 spEntityId,
    idpIssuer:              process.env.SAML_IDP_ENTITY_ID,
    cert:                   ensurePemCert(idpCert),
    wantAssertionsSigned:   process.env.SAML_WANT_ASSERTIONS_SIGNED !== "false",
    signatureAlgorithm:     "sha256",
    digestAlgorithm:        "sha256",
    identifierFormat:       "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    disableRequestedAuthnContext: true,
  };
}

export function getSamlClient(): SAML {
  return new SAML(getSamlConfig());
}

export function samlConfigured(): boolean {
  return !!(
    process.env.SAML_IDP_ENTITY_ID &&
    process.env.SAML_IDP_SSO_URL &&
    process.env.SAML_IDP_CERT
  );
}

export type SamlUserProfile = {
  email:  string;
  name:   string | null;
  nameId: string;
};

// Extract a normalised user profile from a validated SAML assertion.
// Handles common attribute name formats from major IdPs (Shibboleth,
// Entra ID, Google Workspace, ADFS).
export function extractUserProfile(profile: Record<string, unknown>): SamlUserProfile {
  const email = (
    (profile["email"] as string) ??
    (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string) ??
    (profile["mail"] as string) ??
    (profile["nameID"] as string) ??
    ""
  ).toLowerCase().trim();

  if (!email || !email.includes("@")) {
    throw new Error(`SAML assertion missing email. Attributes: ${Object.keys(profile).join(", ")}`);
  }

  const name = (
    (profile["displayName"] as string) ??
    (profile["http://schemas.microsoft.com/identity/claims/displayname"] as string) ??
    [
      profile["givenName"] ?? profile["firstName"],
      profile["sn"] ?? profile["lastName"],
    ]
      .filter(Boolean)
      .join(" ")
  ) || null;

  return {
    email,
    name:   name ? String(name).trim() : null,
    nameId: (profile["nameID"] as string) ?? email,
  };
}

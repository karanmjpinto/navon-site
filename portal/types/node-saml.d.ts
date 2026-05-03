declare module "node-saml" {
  export interface SamlConfig {
    callbackUrl: string;
    entryPoint: string;
    issuer: string;
    idpIssuer?: string;
    cert: string | string[];
    wantAssertionsSigned?: boolean;
    signatureAlgorithm?: string;
    digestAlgorithm?: string;
    identifierFormat?: string | null;
    disableRequestedAuthnContext?: boolean;
    passive?: boolean;
    [key: string]: unknown;
  }

  export class SAML {
    constructor(options: SamlConfig);
    getAuthorizeUrl(opts?: { RelayState?: string; additionalParams?: Record<string, string> }): Promise<string>;
    validatePostResponse(container: { SAMLResponse: string }): Promise<{ profile: unknown; loggedOut: boolean }>;
    generateServiceProviderMetadata(decryptionCert: string | null, signingCert: string | null): string;
  }
}

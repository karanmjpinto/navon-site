import crypto from "node:crypto";

export const TOKEN_PREFIX = "navon_mt_";

// Token format: navon_mt_<32 url-safe bytes>. Stored as SHA-256 hash.
export function generateToken(): { plaintext: string; hash: string; prefix: string } {
  const bytes = crypto.randomBytes(32).toString("base64url");
  const plaintext = `${TOKEN_PREFIX}${bytes}`;
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  // First 12 chars of plaintext are kept for human-readable prefix display.
  const prefix = plaintext.slice(0, TOKEN_PREFIX.length + 4);
  return { plaintext, hash, prefix };
}

export function hashToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

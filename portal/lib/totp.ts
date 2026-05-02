import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Navon Portal";

export function generateSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildTotp(secret: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function provisioningUri(secret: string, label: string): string {
  return buildTotp(secret, label).toString();
}

export async function provisioningQrDataUrl(
  secret: string,
  label: string,
): Promise<string> {
  return QRCode.toDataURL(provisioningUri(secret, label), {
    margin: 1,
    width: 220,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

// Tolerate one period of drift (≈30s) in either direction.
export function verifyTotp(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const totp = buildTotp(secret, "validation");
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

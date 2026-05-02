// Tiny IPv4 helpers for IPAM. Only IPv4 is supported in v1; IPv6 lands
// when a customer needs it (the data model already accepts arbitrary
// `text` so the schema is forward-compatible).

export function isValidCidr(cidr: string): boolean {
  const m = cidr.match(/^(\d{1,3}\.){3}\d{1,3}\/(\d|[12]\d|3[0-2])$/);
  if (!m) return false;
  const [addr] = cidr.split("/");
  return addr.split(".").every((o) => {
    const n = Number(o);
    return n >= 0 && n <= 255;
  });
}

export function isValidIpv4(addr: string): boolean {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(addr)) return false;
  return addr.split(".").every((o) => {
    const n = Number(o);
    return n >= 0 && n <= 255;
  });
}

function ipToInt(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

export function cidrSize(cidr: string): number {
  const prefix = Number(cidr.split("/")[1]);
  return Math.pow(2, 32 - prefix);
}

// Returns true if `addr` is inside `cidr`. Uses unsigned compare so the
// JS sign bit on /0..2 doesn't bite.
export function ipInCidr(addr: string, cidr: string): boolean {
  if (!isValidIpv4(addr) || !isValidCidr(cidr)) return false;
  const [base, p] = cidr.split("/");
  const prefix = Number(p);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return ((ipToInt(addr) & mask) >>> 0) === ((ipToInt(base) & mask) >>> 0);
}

// TypeScript types for the NetBox REST API objects consumed by the sync worker.
// Derived from the NetBox v4.x OpenAPI schema; only fields the sync uses are
// included — extra fields returned by the API are silently ignored.

export interface NetBoxRef {
  id: number;
  name?: string;
  slug?: string;
  display?: string;
}

export interface NetBoxChoiceField {
  value: string;
  label: string;
}

// ── Tenancy ────────────────────────────────────────────────────────
export interface NetBoxTenant {
  id: number;
  name: string;
  slug: string;
}

// ── DCIM ──────────────────────────────────────────────────────────
export interface NetBoxSite {
  id: number;
  name: string;
  slug: string;
  status: NetBoxChoiceField;
  physical_address: string | null;
  tenant: NetBoxRef | null;
}

export interface NetBoxRack {
  id: number;
  name: string;
  site: NetBoxRef;
  tenant: NetBoxRef | null;
  status: NetBoxChoiceField;
  u_height: number;
  facility_id: string | null;
}

export interface NetBoxDeviceType {
  id: number;
  model: string;
  slug: string;
  manufacturer: NetBoxRef;
  u_height: number;
}

export interface NetBoxDeviceRole {
  id: number;
  name: string;
  slug: string;
}

export interface NetBoxDevice {
  id: number;
  name: string | null;
  device_type: NetBoxDeviceType;
  role: NetBoxDeviceRole;   // v4.x renamed device_role → role
  tenant: NetBoxRef | null;
  site: NetBoxRef;
  rack: NetBoxRef | null;
  position: number | null;
  serial: string;
  status: NetBoxChoiceField;
}

// ── Circuits ───────────────────────────────────────────────────────
export interface NetBoxProvider {
  id: number;
  name: string;
  slug: string;
}

export interface NetBoxCircuitType {
  id: number;
  name: string;
  slug: string;
}

export interface NetBoxCircuit {
  id: number;
  cid: string;
  provider: NetBoxRef;
  type: NetBoxRef;
  tenant: NetBoxRef | null;
  status: NetBoxChoiceField;
  commit_rate: number | null;
  description: string;
}

// ── IPAM ───────────────────────────────────────────────────────────

export interface NetBoxVlan {
  id: number;
  vid: number;
  name: string;
  status: NetBoxChoiceField;
  site: NetBoxRef | null;
  tenant: NetBoxRef | null;
  description: string;
}

export interface NetBoxPrefix {
  id: number;
  prefix: string;
  status: NetBoxChoiceField;
  site: NetBoxRef | null;
  vlan: NetBoxRef | null;
  tenant: NetBoxRef | null;
  role: NetBoxRef | null;
  is_pool: boolean;
  description: string;
}

export interface NetBoxIpAddress {
  id: number;
  address: string;
  status: NetBoxChoiceField;
  dns_name: string;
  description: string;
  tenant: NetBoxRef | null;
  assigned_object?: {
    id: number;
    device?: NetBoxRef;
  } | null;
}

// ── Paginated list response (all list endpoints) ───────────────────
export interface NetBoxList<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

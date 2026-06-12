import type {
  CrossConnectStatus,
  CrossConnectType,
  CrossConnectMedia,
} from "@/db/schema";

export const STATUS_CHIP: Record<CrossConnectStatus, string> = {
  pending: "bg-signal text-ink",
  provisioned: "bg-paper text-ink",
  decommissioned: "bg-ink-2 text-mid border border-charcoal",
};

export const STATUS_LABEL: Record<CrossConnectStatus, string> = {
  pending: "Pending",
  provisioned: "Live",
  decommissioned: "Decommissioned",
};

export const TYPE_LABEL: Record<CrossConnectType, string> = {
  cloud: "Cloud on-ramp",
  carrier: "Carrier",
  customer: "Customer / peer",
  internal: "Internal",
  ix: "IX peering",
};

export const MEDIA_LABEL: Record<CrossConnectMedia, string> = {
  fiber_sm: "Single-mode fibre",
  fiber_mm: "Multi-mode fibre",
  copper: "Copper",
};

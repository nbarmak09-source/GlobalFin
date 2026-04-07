import type { TierCompany } from "@/lib/tiers";
import { NODES, TIER_GRAPH_COLORS, POWER_TIER_LABELS } from "@/lib/tiers";

export type { PowerTier } from "@/lib/tiers";
export type EcoNode = TierCompany;

/** @deprecated Use TIER_GRAPH_COLORS from @/lib/tiers */
export const TIER_COLORS = TIER_GRAPH_COLORS;

/** @deprecated Use POWER_TIER_LABELS from @/lib/tiers */
export const TIER_LABELS = POWER_TIER_LABELS;

export { NODES };

export type EdgeType = "compute" | "equity" | "hardware" | "distribution";

export interface EcoEdge {
  source: string;
  target: string;
  type: EdgeType;
  label: string;
}

export const EDGES: EcoEdge[] = [
  { source: "openai", target: "azure", type: "compute", label: "compute" },
  { source: "openai", target: "nvidia", type: "hardware", label: "hardware" },
  { source: "anthropic", target: "aws", type: "compute", label: "compute" },
  { source: "anthropic", target: "google", type: "equity", label: "equity" },
  { source: "mistral", target: "azure", type: "compute", label: "compute" },
  { source: "mistral", target: "nvidia", type: "hardware", label: "hardware" },
  { source: "cohere", target: "aws", type: "compute", label: "compute" },
  { source: "adept", target: "google", type: "compute", label: "compute" },
  { source: "wrapperflow", target: "azure", type: "compute", label: "compute" },
  { source: "promptcheap", target: "aws", type: "compute", label: "compute" },
  { source: "chainrelay", target: "google", type: "compute", label: "compute" },
  { source: "microagent", target: "azure", type: "compute", label: "compute" },
];

export const EDGE_COLORS: Record<EdgeType, string> = {
  compute: "#3b82f6",
  hardware: "#f59e0b",
  equity: "#10b981",
  distribution: "#8b5cf6",
};

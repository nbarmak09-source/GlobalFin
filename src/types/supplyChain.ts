/**
 * Types for `public/data/supply-chain-layers.json` — layered view of the AI
 * semiconductor supply chain. Sits alongside ecosystem power-tier data (`tiers.json`)
 * and dependency edges (`ecosystemData` / `revenue-loops.json`); does not replace them.
 */

/** UI token for layer styling (matches JSON string values). */
export type SupplyChainLayerColor =
  | "purple"
  | "blue"
  | "teal"
  | "amber"
  | "coral"
  | "pink"
  | (string & {});

/** Qualitative bottleneck severity for the whole layer. */
export type SupplyChainBottleneckRisk =
  | "critical"
  | "high"
  | "medium"
  | "low";

/**
 * Competitive / structural role of a node within its layer.
 * Distinct from power-tier `lord` | `vassal` in `tiers.json` — here `lord`/`vassal`
 * describe moat narrative in the supply-chain doc only.
 */
export type SupplyChainMoatType =
  | "duopoly"
  | "monopoly"
  | "oligopoly"
  | "toll"
  | "leader"
  | "utility"
  | "lord"
  | "vassal"
  | "partial-lord"
  | (string & {});

/** One company (listed ticker or private) positioned in a supply-chain layer. */
export interface SupplyChainCompany {
  /** Exchange ticker when publicly traded; `null` for private labs (e.g. OpenAI). */
  ticker: string | null;
  name: string;
  /** Function in this layer (e.g. "EDA Software", "Infrastructure Lord"). */
  role: string;
  moatType: SupplyChainMoatType;
  /** Short thesis on structural advantage or dependency. */
  moatSummary: string;
  /** One-line concentration / risk label for UI. */
  concentrationNote: string;
}

/** A vertical slice of the stack from design silicon through models. */
export interface SupplyChainLayer {
  id: string;
  name: string;
  nickname: string;
  color: SupplyChainLayerColor;
  bottleneckRisk: SupplyChainBottleneckRisk;
  companies: SupplyChainCompany[];
}

/** Root document shape for `supply-chain-layers.json`. */
export interface SupplyChainLayersFile {
  /** Aligns with other `/data/*.json` files (`tiers.json`, etc.). */
  schemaVersion: number;
  description: string;
  layers: SupplyChainLayer[];
}

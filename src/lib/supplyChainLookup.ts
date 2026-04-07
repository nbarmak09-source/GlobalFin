import type { EcoNode } from "@/lib/ecosystemData";
import type {
  SupplyChainCompany,
  SupplyChainLayersFile,
} from "@/types/supplyChain";
import supplyChainJson from "../../public/data/supply-chain-layers.json";

/** Display color for layer token (ticker tape dot, small badges). */
export const SUPPLY_CHAIN_LAYER_DOT: Record<string, string> = {
  purple: "#a855f7",
  blue: "#3b82f6",
  teal: "#14b8a6",
  amber: "#f59e0b",
  coral: "#fb7185",
  pink: "#ec4899",
};

export interface SupplyChainMatch {
  layerId: string;
  layerName: string;
  /** JSON `color` field (purple, blue, …). */
  layerColorToken: string;
  /** Hex for UI dots / accents. */
  dotColor: string;
  company: SupplyChainCompany;
}

/** Full document for dashboards and tooling (same file as `/data/supply-chain-layers.json`). */
export const SUPPLY_CHAIN_LAYERS_DATA: SupplyChainLayersFile =
  supplyChainJson as SupplyChainLayersFile;

const file = SUPPLY_CHAIN_LAYERS_DATA;

/** Yahoo / UI may use a different symbol than the JSON ticker. */
const TICKER_ALIASES: Record<string, string> = {
  GOOGL: "GOOG",
};

const byTicker = new Map<string, SupplyChainMatch>();
const byNameNorm = new Map<string, SupplyChainMatch>();

function normName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

for (const layer of file.layers) {
  const dot =
    SUPPLY_CHAIN_LAYER_DOT[layer.color] ??
    SUPPLY_CHAIN_LAYER_DOT.purple;
  for (const company of layer.companies) {
    const match: SupplyChainMatch = {
      layerId: layer.id,
      layerName: layer.name,
      layerColorToken: layer.color,
      dotColor: dot,
      company,
    };
    if (company.ticker) {
      const t = company.ticker.toUpperCase();
      byTicker.set(t, match);
    }
    byNameNorm.set(normName(company.name), match);
  }
}

export function getSupplyChainByTicker(
  symbol: string | null | undefined
): SupplyChainMatch | undefined {
  if (!symbol?.trim()) return undefined;
  const u = symbol.trim().toUpperCase();
  return (
    byTicker.get(u) ??
    (TICKER_ALIASES[u] ? byTicker.get(TICKER_ALIASES[u]) : undefined)
  );
}

/**
 * Match ecosystem graph node: listed symbols first, then display name to supply-chain `name`.
 */
export function getSupplyChainForEcosystemNode(
  node: EcoNode
): SupplyChainMatch | undefined {
  for (const s of node.symbols) {
    const m = getSupplyChainByTicker(s);
    if (m) return m;
  }
  return byNameNorm.get(normName(node.displayName));
}

export function buildSupplyChainViewHref(match: SupplyChainMatch): string {
  const t = match.company.ticker?.toUpperCase();
  const highlight = t ?? encodeURIComponent(match.company.name);
  return `/supply-chain?layer=${encodeURIComponent(match.layerId)}&highlight=${highlight}`;
}

/** Higher = more structural concentration (for picking a “key” company per layer). */
const MOAT_CONCENTRATION_RANK: Record<string, number> = {
  monopoly: 100,
  duopoly: 90,
  oligopoly: 80,
  toll: 75,
  leader: 72,
  lord: 68,
  "partial-lord": 65,
  vassal: 58,
  utility: 52,
};

function moatRank(moatType: string): number {
  return MOAT_CONCENTRATION_RANK[moatType] ?? 0;
}

/** Representative row: strongest concentration moat in the layer (tie-break by name). */
export function pickRepresentativeCompany(
  companies: SupplyChainCompany[]
): SupplyChainCompany {
  return [...companies].sort(
    (a, b) =>
      moatRank(b.moatType) - moatRank(a.moatType) ||
      a.name.localeCompare(b.name)
  )[0];
}

export function buildSupplyChainLayerHref(
  layerId: string,
  rep: SupplyChainCompany
): string {
  const t = rep.ticker?.toUpperCase();
  const highlight = t ?? encodeURIComponent(rep.name);
  return `/supply-chain?layer=${encodeURIComponent(layerId)}&highlight=${highlight}`;
}

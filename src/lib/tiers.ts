import { z } from "zod";
import tiersJson from "../../public/data/tiers.json";

export const POWER_TIER_IDS = ["lord", "vassal", "serf"] as const;
export type PowerTier = (typeof POWER_TIER_IDS)[number];

export const POWER_TIER_LABELS: Record<PowerTier, string> = {
  lord: "Infrastructure Lords",
  vassal: "Value-Add Vassals",
  serf: "Retail Serfs",
};

export const POWER_TIER_SHORT: Record<PowerTier, string> = {
  lord: "Lord",
  vassal: "Vassal",
  serf: "Serf",
};

/** Hex colors for graph edges / non-badge surfaces */
export const TIER_GRAPH_COLORS: Record<PowerTier, string> = {
  lord: "#1e3a8a",
  vassal: "#d97706",
  serf: "#6b7280",
};

const baseCompanyFields = {
  id: z.string().min(1),
  displayName: z.string().min(1),
  symbols: z.array(z.string()),
  primaryDependency: z.string(),
  selfOwnership: z.number().min(0).max(100),
};

const lordCompanySchema = z.object({
  ...baseCompanyFields,
  tier: z.literal("lord"),
  tetherScore: z.null(),
  primaryLordId: z.null(),
});

const vassalCompanySchema = z.object({
  ...baseCompanyFields,
  tier: z.literal("vassal"),
  tetherScore: z.number().min(0).max(100),
  primaryLordId: z.string().min(1),
});

const serfCompanySchema = z.object({
  ...baseCompanyFields,
  tier: z.literal("serf"),
  tetherScore: z.null(),
  primaryLordId: z.null(),
});

export const tierCompanySchema = z.discriminatedUnion("tier", [
  lordCompanySchema,
  vassalCompanySchema,
  serfCompanySchema,
]);

export type TierCompany = z.infer<typeof tierCompanySchema>;

export const tiersFileSchema = z.object({
  schemaVersion: z.number(),
  companies: z.array(tierCompanySchema),
});

export type TiersFile = z.infer<typeof tiersFileSchema>;

/** Validate untrusted JSON (e.g. fetched at runtime) against the same schema as the bundled file. */
export function parseTiersFile(raw: unknown): TiersFile {
  return tiersFileSchema.parse(raw);
}

export const TIERS_CATALOG: TiersFile = tiersFileSchema.parse(tiersJson);

/** All AI terminal companies (ecosystem graph nodes, lists, lookups). */
export const NODES = TIERS_CATALOG.companies;

const byId = new Map(TIERS_CATALOG.companies.map((c) => [c.id, c]));
const bySymbol = new Map<string, TierCompany>();
for (const c of TIERS_CATALOG.companies) {
  for (const s of c.symbols) {
    bySymbol.set(s.toUpperCase(), c);
  }
}

export function getTier(companyId: string): TierCompany | undefined {
  return byId.get(companyId);
}

export function getTierBySymbol(symbol: string): TierCompany | undefined {
  if (!symbol?.trim()) return undefined;
  return bySymbol.get(symbol.trim().toUpperCase());
}

export function getLordDisplayName(lordId: string): string {
  const c = byId.get(lordId);
  return c?.displayName ?? lordId;
}

export const TETHER_WARNING_THRESHOLD = 70;

export function isHighTetherDependency(score: number): boolean {
  return score > TETHER_WARNING_THRESHOLD;
}

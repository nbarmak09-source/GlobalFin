"use client";

import { useRouter } from "next/navigation";
import { X, ExternalLink, Network, Lock, AlertTriangle, Shield } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import type { SupplyChainCompany, SupplyChainLayer } from "@/types/supplyChain";
import {
  getTierBySymbol,
  getLordDisplayName,
  isHighTetherDependency,
} from "@/lib/tiers";
import PowerTierBadge from "@/components/research/PowerTierBadge";
import { SUPPLY_CHAIN_LAYERS_DATA } from "@/lib/supplyChainLookup";

// ─── Static descriptions ──────────────────────────────────────────────────────

const MOAT_DESCRIPTIONS: Record<string, string> = {
  monopoly:
    "Single dominant supplier with no viable alternatives — absolute pricing power and near-zero substitution risk.",
  duopoly:
    "Two-player market with coordinated pricing power and near-impenetrable barriers to entry.",
  oligopoly:
    "Small concentrated cluster of suppliers — high structural barriers, limited viable competition.",
  lord:
    "Infrastructure lord — controls the critical platform layer that all others in the stack depend on.",
  vassal:
    "Platform-dependent operator — valuable capabilities but structurally tethered to an infrastructure lord.",
  toll:
    "Essential chokepoint that captures value from every transaction flowing through this node.",
  utility:
    "Critical commodity layer — non-negotiable access, but faces margin pressure from standardization.",
  leader:
    "Market leader with dominant share, but meaningful competition keeps the position contestable.",
  "partial-lord":
    "Partial infrastructure control — significant platform leverage without full monopolistic positioning.",
};

const BOTTLENECK_DESCRIPTIONS: Record<string, string> = {
  critical: "Any disruption here cascades through the entire AI stack immediately.",
  high: "Supply disruptions would create significant downstream bottlenecks industry-wide.",
  medium: "Some concentration risk — alternatives exist, but switching is slow and costly.",
  low: "Multiple viable suppliers — disruptions are manageable with modest lead time.",
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  lord: "Controls foundational infrastructure that others pay to access. Sets the terms.",
  vassal: "Provides differentiated value on top of lord infrastructure. Dependent but essential.",
  serf: "End-market participant buying capacity. Price-taker with limited structural leverage.",
};

// ─── Moat badge ───────────────────────────────────────────────────────────────

const MOAT_BADGE: Record<string, string> = {
  monopoly:       "bg-red/15 text-red border border-red/35",
  duopoly:        "bg-orange-500/15 text-orange-400 border border-orange-500/35",
  oligopoly:      "bg-amber-500/15 text-amber-400 border border-amber-500/35",
  lord:           "bg-blue-500/15 text-blue-400 border border-blue-500/35",
  vassal:         "bg-purple-500/15 text-purple-400 border border-purple-500/35",
  toll:           "bg-teal-500/15 text-teal-400 border border-teal-500/35",
  utility:        "bg-green/15 text-green border border-green/35",
  leader:         "bg-sky-500/15 text-sky-400 border border-sky-500/35",
  "partial-lord": "bg-indigo-500/15 text-indigo-400 border border-indigo-500/35",
};

function MoatBadge({ moatType, large }: { moatType: string; large?: boolean }) {
  const cls = MOAT_BADGE[moatType] ?? "bg-card-hover text-muted border border-border";
  return (
    <span
      className={`inline-flex items-center rounded font-semibold uppercase tracking-wide ${
        large ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
      } ${cls}`}
    >
      {moatType}
    </span>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

const RISK_BADGE: Record<string, string> = {
  critical: "bg-red/15 text-red border border-red/30",
  high:     "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  medium:   "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  low:      "bg-green/15 text-green border border-green/30",
};

function RiskBadge({ risk }: { risk: string }) {
  const cls = RISK_BADGE[risk] ?? "bg-card-hover text-muted border border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${cls}`}>
      {risk}
    </span>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
      {children}
    </p>
  );
}

// ─── Layer stack track ────────────────────────────────────────────────────────

const LAYER_COLORS: Record<string, string> = {
  L1: "#7c3aed", L2: "#2563eb", L3: "#0d9488",
  L4: "#d97706", L5: "#dc2626", L6: "#f472b6",
};

function LayerTrack({ currentId }: { currentId: string }) {
  const allLayers = SUPPLY_CHAIN_LAYERS_DATA.layers;
  return (
    <div className="flex items-center gap-1.5">
      {allLayers.map((l) => {
        const active = l.id === currentId;
        const color = LAYER_COLORS[l.id] ?? "#6b7280";
        return (
          <div key={l.id} className="flex flex-col items-center gap-1">
            <div
              className={`rounded-full transition-all ${
                active ? "w-3 h-3" : "w-2 h-2 opacity-35"
              }`}
              style={{ background: active ? color : "#6b7280" }}
            />
            <span
              className={`font-mono text-[9px] ${
                active ? "font-bold" : "text-muted"
              }`}
              style={active ? { color } : undefined}
            >
              {l.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Self-ownership bar ───────────────────────────────────────────────────────

function OwnershipBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Infra self-ownership</span>
        <span className="font-mono font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Tether bar ──────────────────────────────────────────────────────────────

function TetherBar({ score, lordName }: { score: number; lordName: string }) {
  const isHigh = isHighTetherDependency(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Tether to {lordName}</span>
        <span className={`font-mono font-semibold ${isHigh ? "text-amber-400" : "text-foreground"}`}>
          {score}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isHigh ? "bg-amber-500" : "bg-blue-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      {isHigh && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>High single-vendor dependency ({score}% &gt; 70% threshold)</span>
        </div>
      )}
    </div>
  );
}

// ─── Left border color per layer ─────────────────────────────────────────────

const LAYER_LEFT_BORDER: Record<string, string> = {
  L1: "#4c1d95", L2: "#1e3a8a", L3: "#134e4a",
  L4: "#92400e", L5: "#9a3412", L6: "#fbcfe8",
};

// ─── Main panel ───────────────────────────────────────────────────────────────

export interface CompanyDetailPanelProps {
  company: SupplyChainCompany;
  layer: SupplyChainLayer;
  quote: StockQuote | undefined;
  onClose: () => void;
}

export default function CompanyDetailPanel({
  company,
  layer,
  quote,
  onClose,
}: CompanyDetailPanelProps) {
  const router = useRouter();
  const sym = company.ticker?.toUpperCase() ?? null;
  const positive = (quote?.regularMarketChange ?? 0) >= 0;
  const borderColor = LAYER_LEFT_BORDER[layer.id] ?? "#6b7280";

  // Ecosystem / power tier data — available if this company is in tiers.json
  const ecoNode = sym ? getTierBySymbol(sym) : undefined;
  const lordName = ecoNode?.tier === "vassal" && ecoNode.primaryLordId
    ? getLordDisplayName(ecoNode.primaryLordId)
    : null;

  const tierColor =
    ecoNode?.tier === "lord" ? "#1e3a8a"
    : ecoNode?.tier === "vassal" ? "#d97706"
    : "#6b7280";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[480px] max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div
          className="px-5 py-4 border-b border-border flex-shrink-0 rounded-t-2xl"
          style={{ borderTopWidth: 3, borderTopColor: borderColor }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Layer breadcrumb */}
              <p className="text-[11px] text-muted font-mono mb-1">
                {layer.id} · {layer.name}
              </p>

              {/* Company name */}
              <h2 className="text-lg font-bold font-serif text-foreground leading-tight">
                {company.name}
              </h2>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <MoatBadge moatType={company.moatType} />
                {ecoNode && <PowerTierBadge tier={ecoNode.tier} />}
                {sym ? (
                  <span className="font-mono text-xs text-muted">{sym}</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted font-mono">
                    <Lock className="h-3 w-3" />
                    Private
                  </span>
                )}
              </div>

              {/* Compact price pill (public only) */}
              {sym && quote && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    ${quote.regularMarketPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className={`font-mono text-xs ${positive ? "text-green" : "text-red"}`}>
                    {positive ? "+" : ""}
                    {quote.regularMarketChange.toFixed(2)} ({positive ? "+" : ""}
                    {quote.regularMarketChangePercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-foreground transition-colors p-1 shrink-0"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ── 1. Layer position ── */}
          <div className="space-y-3">
            <SectionLabel>Layer Position</SectionLabel>

            <LayerTrack currentId={layer.id} />

            <div className="rounded-xl border border-border bg-background/40 px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{layer.name}</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{layer.nickname}</p>
                </div>
                <RiskBadge risk={layer.bottleneckRisk} />
              </div>
              <p className="text-xs text-muted leading-relaxed border-t border-border/50 pt-2">
                {BOTTLENECK_DESCRIPTIONS[layer.bottleneckRisk] ?? ""}
              </p>
              <p className="text-[11px] text-muted/70">
                {layer.companies.length} {layer.companies.length === 1 ? "company" : "companies"} in this layer
              </p>
            </div>
          </div>

          {/* ── 2. Structural role ── */}
          <div className="space-y-2">
            <SectionLabel>Structural Role</SectionLabel>
            <p className="text-sm font-medium text-foreground">{company.role}</p>
            <div className="rounded-lg border-l-2 border-accent/50 bg-accent/5 px-3 py-2">
              <p className="text-xs text-foreground/80 leading-relaxed">{company.concentrationNote}</p>
            </div>
          </div>

          {/* ── 3. Moat analysis ── */}
          <div className="space-y-3">
            <SectionLabel>Moat Analysis</SectionLabel>

            <div className="flex items-start gap-3">
              <MoatBadge moatType={company.moatType} large />
              <p className="text-xs text-muted leading-relaxed">
                {MOAT_DESCRIPTIONS[company.moatType] ?? "Structural competitive position within this layer."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
              <p className="text-sm text-foreground/85 leading-relaxed">
                {company.moatSummary}
              </p>
            </div>
          </div>

          {/* ── 4. Ecosystem position (only if in tiers.json) ── */}
          {ecoNode && (
            <div className="space-y-3">
              <SectionLabel>Ecosystem Power Tier</SectionLabel>

              <div className="rounded-xl border border-border bg-background/40 px-4 py-3 space-y-3">
                {/* Tier badge + description */}
                <div className="flex items-start gap-3">
                  <PowerTierBadge tier={ecoNode.tier} />
                  <p className="text-xs text-muted leading-relaxed">
                    {TIER_DESCRIPTIONS[ecoNode.tier] ?? ""}
                  </p>
                </div>

                {/* Primary dependency */}
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted uppercase tracking-wide font-medium">Primary Dependency</p>
                  <p className="text-sm text-foreground">{ecoNode.primaryDependency}</p>
                </div>

                {/* Self-ownership bar */}
                <OwnershipBar pct={ecoNode.selfOwnership} color={tierColor} />

                {/* Tether score (vassals only) */}
                {ecoNode.tier === "vassal" && ecoNode.tetherScore !== null && lordName && (
                  <TetherBar score={ecoNode.tetherScore} lordName={lordName} />
                )}
              </div>
            </div>
          )}

          {/* ── 5. Private company note ── */}
          {!sym && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <Shield className="h-4 w-4 text-muted shrink-0" />
              <p className="text-xs text-muted">Private company — no public market data.</p>
            </div>
          )}

        </div>

        {/* ── Action buttons ── */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-2">
          {sym && (
            <a
              href={`/stocks?symbol=${encodeURIComponent(sym)}`}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent text-white text-sm font-medium py-2.5 hover:bg-accent/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Full Stock Analysis
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              router.push("/supply-chain?industry=semiconductors&view=ecosystem");
              onClose();
            }}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-card text-sm font-medium text-foreground py-2.5 hover:bg-card-hover transition-colors"
          >
            <Network className="h-4 w-4" />
            View in Ecosystem Map
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

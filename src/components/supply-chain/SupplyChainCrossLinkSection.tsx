"use client";

import Link from "next/link";
import type { SupplyChainMatch } from "@/lib/supplyChainLookup";
import { buildSupplyChainViewHref } from "@/lib/supplyChainLookup";

const MOAT_INLINE: Record<string, string> = {
  monopoly: "bg-red/15 text-red border border-red/35",
  duopoly: "bg-orange-500/15 text-orange-400 border border-orange-500/35",
  oligopoly: "bg-amber-500/15 text-amber-400 border border-amber-500/35",
  lord: "bg-blue-500/15 text-blue-400 border border-blue-500/35",
  vassal: "bg-purple-500/15 text-purple-400 border border-purple-500/35",
  toll: "bg-teal-500/15 text-teal-400 border border-teal-500/35",
  utility: "bg-green/15 text-green border border-green/35",
  leader: "bg-sky-500/15 text-sky-400 border border-sky-500/35",
  "partial-lord":
    "bg-indigo-500/15 text-indigo-400 border border-indigo-500/35",
};

interface SupplyChainCrossLinkSectionProps {
  match: SupplyChainMatch;
  /** Smaller padding when used in narrow drawer. */
  compact?: boolean;
}

export default function SupplyChainCrossLinkSection({
  match,
  compact,
}: SupplyChainCrossLinkSectionProps) {
  const href = buildSupplyChainViewHref(match);
  const moatCls =
    MOAT_INLINE[match.company.moatType] ??
    "bg-card-hover text-muted border border-border";

  return (
    <div
      className={`rounded-xl border border-border bg-card ${
        compact ? "p-3 space-y-2" : "p-4 space-y-3"
      }`}
    >
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
        Supply Chain Position
      </h3>
      <p className="text-sm text-foreground">
        <span className="font-mono font-semibold text-accent">
          {match.layerId}
        </span>
        <span className="text-muted"> — </span>
        <span>{match.layerName}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${moatCls}`}
        >
          {match.company.moatType}
        </span>
        <span className="text-xs text-muted">{match.company.role}</span>
      </div>
      <p className="text-xs text-foreground/90 leading-relaxed">
        {match.company.moatSummary}
      </p>
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
      >
        View in Supply Chain
      </Link>
    </div>
  );
}

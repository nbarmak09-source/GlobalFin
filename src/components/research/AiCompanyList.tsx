"use client";

import Link from "next/link";
import PowerTierBadge from "@/components/research/PowerTierBadge";
import { useTierFilter } from "@/lib/useTierFilter";
import type { TierCompany } from "@/lib/tiers";
import { NODES } from "@/lib/tiers";
import type { PowerTier } from "@/lib/tiers";
import { POWER_TIER_LABELS } from "@/lib/tiers";

const TIER_ORDER: PowerTier[] = ["lord", "vassal", "serf"];

interface AiCompanyListProps {
  companies?: TierCompany[];
}

export default function AiCompanyList({ companies = NODES }: AiCompanyListProps) {
  const { toggleTier, selectAllTiers, filteredCompanies, isTierSelected } =
    useTierFilter(companies);

  const sorted = [...filteredCompanies].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-border bg-background/40">
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI companies</h3>
          <p className="text-[11px] text-muted mt-0.5">
            Power-tier view — filter by Infrastructure Lords, Value-Add Vassals, or Retail Serfs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TIER_ORDER.map((tier) => (
            <label
              key={tier}
              className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs"
            >
              <input
                type="checkbox"
                className="rounded border-border accent-[#1e3a8a]"
                checked={isTierSelected(tier)}
                onChange={() => toggleTier(tier)}
              />
              <span className="text-foreground/90">{POWER_TIER_LABELS[tier]}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={selectAllTiers}
            className="text-[11px] text-accent hover:underline ml-1"
          >
            All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
              <th className="text-left py-2.5 px-4 font-medium">Company</th>
              <th className="text-left py-2.5 px-4 font-medium">Ticker</th>
              <th className="text-left py-2.5 px-4 font-medium">Power tier</th>
              <th className="text-left py-2.5 px-4 font-medium min-w-[200px]">
                Primary dependency
              </th>
              <th className="text-right py-2.5 px-4 font-medium whitespace-nowrap">
                Infra self-ownership
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border/50 hover:bg-card-hover/50 transition-colors"
              >
                <td className="py-2.5 px-4">
                  <div className="font-medium text-foreground">{c.displayName}</div>
                  <div className="text-[11px] text-muted font-mono">{c.id}</div>
                </td>
                <td className="py-2.5 px-4 text-xs font-mono">
                  {c.symbols.length === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-2">
                      {c.symbols.map((sym) => (
                        <Link
                          key={sym}
                          href={`/stocks?symbol=${encodeURIComponent(sym)}`}
                          className="text-accent hover:underline"
                        >
                          {sym}
                        </Link>
                      ))}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  <PowerTierBadge tier={c.tier} />
                </td>
                <td className="py-2.5 px-4 text-xs text-muted max-w-[240px]">
                  {c.primaryDependency}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-xs">
                  {c.selfOwnership}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-4 py-2 text-[10px] text-muted border-t border-border">
        Tickers link to the company detail page when a symbol is listed. Private labs show an em dash.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { QuoteSummaryData } from "@/lib/types";
import TradingViewChart from "@/components/TradingViewChart";
import PowerTierBadge from "@/components/research/PowerTierBadge";
import {
  getTierBySymbol,
  getLordDisplayName,
  isHighTetherDependency,
} from "@/lib/tiers";
import { getSupplyChainByTicker } from "@/lib/supplyChainLookup";
import SupplyChainCrossLinkSection from "@/components/supply-chain/SupplyChainCrossLinkSection";
import {
  Globe,
  MapPin,
  Phone,
  Users,
  Building2,
  Factory,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface OverviewTabProps {
  data: QuoteSummaryData;
  symbol: string;
  onViewChart: () => void;
}

export default function OverviewTab({ data, symbol, onViewChart }: OverviewTabProps) {
  const [expanded, setExpanded] = useState(false);
  const powerTier = getTierBySymbol(symbol);
  const supplyChainMatch = getSupplyChainByTicker(symbol);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {data.longBusinessSummary && (
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                About
              </h3>
              <div
                className="text-sm leading-relaxed text-foreground/80"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: expanded ? "unset" : 4,
                  WebkitBoxOrient: "vertical",
                  overflow: expanded ? "visible" : "hidden",
                }}
              >
                {data.longBusinessSummary}
              </div>
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="text-accent text-sm font-medium hover:opacity-80 transition-opacity mt-1"
              >
                {expanded ? "Show less" : "Read more →"}
              </button>
            </div>
          )}

          <div
            className="rounded-xl bg-card border border-border p-5 cursor-pointer group relative overflow-hidden flex flex-col h-[min(62vh,580px)] min-h-[320px]"
            onClick={onViewChart}
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
                Price Chart
              </h3>
              <span className="text-xs text-accent flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                View Full Chart <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="pointer-events-none flex-1 min-h-[280px] min-w-0 flex flex-col">
              <TradingViewChart
                fill
                symbol={symbol}
                interval="D"
                yahooExchange={data.exchange}
                yahooExchangeName={data.exchangeName}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-card border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Company Info
            </h3>

            {powerTier ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-4 w-4 text-muted flex-shrink-0" />
                  <span className="text-muted">Power tier:</span>
                  <PowerTierBadge tier={powerTier.tier} long />
                </div>
                {powerTier.tier === "vassal" && (
                  <div className="rounded-lg border border-border bg-background/70 px-3 py-2 space-y-1">
                    <p className="text-xs text-muted uppercase tracking-wide font-medium">
                      Tether score
                    </p>
                    <p className="text-sm text-foreground">
                      <span className="font-mono font-semibold">
                        {powerTier.tetherScore}%
                      </span>
                      <span className="text-muted"> from a single Lord </span>
                      <span className="font-medium">
                        ({getLordDisplayName(powerTier.primaryLordId)})
                      </span>
                    </p>
                    {isHighTetherDependency(powerTier.tetherScore) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        High single-vendor dependency
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              data.sector && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted flex-shrink-0" />
                  <span className="text-muted">Sector:</span>
                  <span className="font-medium">{data.sector}</span>
                </div>
              )
            )}
            {data.industry && (
              <div className="flex items-center gap-2 text-sm">
                <Factory className="h-4 w-4 text-muted flex-shrink-0" />
                <span className="text-muted">Industry:</span>
                <span className="font-medium">{data.industry}</span>
              </div>
            )}
            {data.fullTimeEmployees > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted flex-shrink-0" />
                <span className="text-muted">Employees:</span>
                <span className="font-medium">
                  {data.fullTimeEmployees.toLocaleString()}
                </span>
              </div>
            )}
            {data.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted flex-shrink-0" />
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline truncate"
                >
                  {data.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {(data.city || data.state || data.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted flex-shrink-0" />
                <span className="font-medium">
                  {[data.city, data.state, data.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {data.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted flex-shrink-0" />
                <span className="font-medium">{data.phone}</span>
              </div>
            )}
          </div>

          {supplyChainMatch && (
            <SupplyChainCrossLinkSection match={supplyChainMatch} />
          )}

          {data.earningsDate && (
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">
                Upcoming Events
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-accent" />
                <span className="text-muted">Earnings:</span>
                <span className="font-medium">{data.earningsDate}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

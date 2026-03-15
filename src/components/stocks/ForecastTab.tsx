"use client";

import type { QuoteSummaryData } from "@/lib/types";
import { Target } from "lucide-react";

function fmt(val: number | null, decimals = 2): string {
  return val != null ? val.toFixed(decimals) : "N/A";
}

function formatLarge(value: number | null): string {
  if (value == null) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function pct(val: number | null): string {
  if (val == null) return "N/A";
  return `${(val * 100).toFixed(2)}%`;
}

function recLabel(key: string): string {
  const map: Record<string, string> = {
    strongBuy: "Strong Buy",
    buy: "Buy",
    hold: "Hold",
    underperform: "Underperform",
    sell: "Sell",
    strong_buy: "Strong Buy",
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

export default function ForecastTab({ data }: { data: QuoteSummaryData }) {
  const currentPrice = data.regularMarketPrice;
  const targetRange = data.targetHighPrice - data.targetLowPrice;
  const currentPct =
    targetRange > 0
      ? ((currentPrice - data.targetLowPrice) / targetRange) * 100
      : 50;

  const currentRec = data.recommendationTrend?.[0];
  const totalRec = currentRec
    ? currentRec.strongBuy +
      currentRec.buy +
      currentRec.hold +
      currentRec.sell +
      currentRec.strongSell
    : 0;

  return (
    <div className="space-y-6">
      {data.targetMeanPrice > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Analyst Price Target
            </h3>
            <span className="text-xs text-muted ml-auto">
              {data.numberOfAnalystOpinions} analysts
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-muted mb-1">Low</div>
              <div className="text-lg font-bold font-mono">
                ${fmt(data.targetLowPrice)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted mb-1">Mean</div>
              <div className="text-lg font-bold font-mono text-accent">
                ${fmt(data.targetMeanPrice)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted mb-1">High</div>
              <div className="text-lg font-bold font-mono">
                ${fmt(data.targetHighPrice)}
              </div>
            </div>
          </div>

          <div className="relative h-3 bg-background rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red/40 via-accent/40 to-green/40 rounded-full" />
            <div
              className="absolute top-0 w-3 h-3 bg-foreground rounded-full border-2 border-accent"
              style={{ left: `${Math.min(Math.max(currentPct, 0), 100)}%`, transform: "translateX(-50%)" }}
              title={`Current: $${currentPrice.toFixed(2)}`}
            />
          </div>
          <div className="text-center mt-2 text-xs text-muted">
            Current: ${currentPrice.toFixed(2)} | Upside:{" "}
            <span
              className={
                data.targetMeanPrice > currentPrice ? "text-green" : "text-red"
              }
            >
              {((data.targetMeanPrice / currentPrice - 1) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentRec && totalRec > 0 && (
          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Analyst Recommendations
            </h3>
            <div className="space-y-2">
              {[
                { label: "Strong Buy", count: currentRec.strongBuy, color: "bg-green" },
                { label: "Buy", count: currentRec.buy, color: "bg-green/60" },
                { label: "Hold", count: currentRec.hold, color: "bg-yellow-500/60" },
                { label: "Sell", count: currentRec.sell, color: "bg-red/60" },
                { label: "Strong Sell", count: currentRec.strongSell, color: "bg-red" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-20">{r.label}</span>
                  <div className="flex-1 h-4 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full ${r.color} rounded-full transition-all`}
                      style={{
                        width: `${(r.count / totalRec) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono font-medium w-6 text-right">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
            {data.recommendationKey && (
              <div className="mt-3 text-center">
                <span className="text-xs text-muted">Consensus: </span>
                <span className="text-sm font-semibold text-accent">
                  {recLabel(data.recommendationKey)}
                </span>
              </div>
            )}
          </div>
        )}

        {data.earningsTrend.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              EPS Estimates
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted uppercase">
                    <th className="text-left py-2 px-2">Period</th>
                    <th className="text-right py-2 px-2">Avg</th>
                    <th className="text-right py-2 px-2">Low</th>
                    <th className="text-right py-2 px-2">High</th>
                    <th className="text-right py-2 px-2">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {data.earningsTrend.map((t, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-border/50 hover:bg-card-hover"
                    >
                      <td className="py-2 px-2 font-medium">{t.period}</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {fmt(t.earningsEstimate.avg)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {fmt(t.earningsEstimate.low)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {fmt(t.earningsEstimate.high)}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-mono ${
                          (t.earningsEstimate.growth ?? 0) >= 0
                            ? "text-green"
                            : "text-red"
                        }`}
                      >
                        {pct(t.earningsEstimate.growth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {data.earningsTrend.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Revenue Estimates
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase">
                  <th className="text-left py-2 px-3">Period</th>
                  <th className="text-right py-2 px-3">Avg</th>
                  <th className="text-right py-2 px-3">Low</th>
                  <th className="text-right py-2 px-3">High</th>
                  <th className="text-right py-2 px-3">Analysts</th>
                  <th className="text-right py-2 px-3">Growth</th>
                </tr>
              </thead>
              <tbody>
                {data.earningsTrend.map((t, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/50 hover:bg-card-hover"
                  >
                    <td className="py-2 px-3 font-medium">{t.period}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatLarge(t.revenueEstimate.avg)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatLarge(t.revenueEstimate.low)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatLarge(t.revenueEstimate.high)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {t.revenueEstimate.numberOfAnalysts ?? "N/A"}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono ${
                        (t.revenueEstimate.growth ?? 0) >= 0
                          ? "text-green"
                          : "text-red"
                      }`}
                    >
                      {pct(t.revenueEstimate.growth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.upgradeDowngradeHistory.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Recent Upgrades & Downgrades
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Firm</th>
                  <th className="text-left py-2 px-3">Action</th>
                  <th className="text-left py-2 px-3">From</th>
                  <th className="text-left py-2 px-3">To</th>
                </tr>
              </thead>
              <tbody>
                {data.upgradeDowngradeHistory.map((entry, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/50 hover:bg-card-hover"
                  >
                    <td className="py-2 px-3 text-muted">{entry.date}</td>
                    <td className="py-2 px-3 font-medium">{entry.firm}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          entry.action === "up"
                            ? "bg-green/10 text-green"
                            : entry.action === "down"
                              ? "bg-red/10 text-red"
                              : "bg-accent/10 text-accent"
                        }`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted">
                      {entry.fromGrade || "—"}
                    </td>
                    <td className="py-2 px-3 font-medium">{entry.toGrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

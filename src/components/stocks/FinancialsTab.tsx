"use client";

import { useState } from "react";
import type { QuoteSummaryData } from "@/lib/types";

function formatLarge(value: number): string {
  if (!value) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function pct(val: number): string {
  return val ? `${(val * 100).toFixed(2)}%` : "N/A";
}

export default function FinancialsTab({ data }: { data: QuoteSummaryData }) {
  const [chartView, setChartView] = useState<"yearly" | "quarterly">("yearly");

  const chartData =
    chartView === "yearly"
      ? data.financialsChartYearly
      : data.financialsChartQuarterly;

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  const profitabilityMetrics = [
    { label: "Gross Margins", value: pct(data.grossMargins) },
    { label: "EBITDA Margins", value: pct(data.ebitdaMargins) },
    { label: "Operating Margins", value: pct(data.operatingMargins) },
    { label: "Profit Margins", value: pct(data.profitMargins) },
    { label: "Return on Assets", value: pct(data.returnOnAssets) },
    { label: "Return on Equity", value: pct(data.returnOnEquity) },
  ];

  const growthMetrics = [
    { label: "Revenue Growth (YoY)", value: pct(data.revenueGrowth) },
    { label: "Earnings Growth (YoY)", value: pct(data.earningsGrowth) },
  ];

  const incomeMetrics = [
    { label: "Total Revenue", value: formatLarge(data.totalRevenue) },
    { label: "Gross Profits", value: formatLarge(data.grossProfits) },
    { label: "EBITDA", value: formatLarge(data.ebitda) },
    { label: "Operating Cashflow", value: formatLarge(data.operatingCashflow) },
    { label: "Free Cashflow", value: formatLarge(data.freeCashflow) },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Revenue & Earnings
          </h3>
          <div className="flex items-center gap-1">
            {(["yearly", "quarterly"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setChartView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartView === v
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">
            No financial data available
          </div>
        ) : (
          <div className="space-y-2">
            {chartData.map((entry, idx) => {
              const revPct = (entry.revenue / maxRevenue) * 100;
              const earnPct = maxRevenue > 0 ? (Math.abs(entry.earnings) / maxRevenue) * 100 : 0;
              const isNegativeEarnings = entry.earnings < 0;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="font-medium">{String(entry.date)}</span>
                    <div className="flex gap-4">
                      <span>
                        Revenue: {formatLarge(entry.revenue)}
                      </span>
                      <span className={isNegativeEarnings ? "text-red" : ""}>
                        Earnings: {formatLarge(entry.earnings)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-5">
                    <div
                      className="bg-accent/60 rounded-sm"
                      style={{ width: `${revPct}%` }}
                      title={`Revenue: ${formatLarge(entry.revenue)}`}
                    />
                  </div>
                  <div className="flex gap-1 h-3">
                    <div
                      className={`rounded-sm ${isNegativeEarnings ? "bg-red/60" : "bg-green/60"}`}
                      style={{ width: `${earnPct}%` }}
                      title={`Earnings: ${formatLarge(entry.earnings)}`}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-accent/60" />
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green/60" />
                <span>Earnings</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.earningsChartQuarterly.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            EPS: Actual vs Estimate
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Quarter</th>
                  <th className="text-right py-2 px-3">Estimate</th>
                  <th className="text-right py-2 px-3">Actual</th>
                  <th className="text-right py-2 px-3">Surprise</th>
                </tr>
              </thead>
              <tbody>
                {data.earningsChartQuarterly.map((q, idx) => {
                  const surprise =
                    q.actual != null ? q.actual - q.estimate : null;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-border/50 hover:bg-card-hover transition-colors"
                    >
                      <td className="py-2 px-3 font-medium">{q.date}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        ${q.estimate.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {q.actual != null ? `$${q.actual.toFixed(2)}` : "—"}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-medium ${
                          surprise != null && surprise >= 0
                            ? "text-green"
                            : "text-red"
                        }`}
                      >
                        {surprise != null
                          ? `${surprise >= 0 ? "+" : ""}$${surprise.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Income & Cash Flow
          </h3>
          <div className="space-y-2">
            {incomeMetrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-background text-sm"
              >
                <span className="text-muted">{m.label}</span>
                <span className="font-mono font-medium">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Profitability
            </h3>
            <div className="space-y-2">
              {profitabilityMetrics.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-background text-sm"
                >
                  <span className="text-muted">{m.label}</span>
                  <span className="font-mono font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Growth
            </h3>
            <div className="space-y-2">
              {growthMetrics.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-background text-sm"
                >
                  <span className="text-muted">{m.label}</span>
                  <span className="font-mono font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

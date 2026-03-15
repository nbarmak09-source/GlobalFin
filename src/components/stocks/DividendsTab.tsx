"use client";

import type { QuoteSummaryData } from "@/lib/types";
import { Banknote, Calendar, Percent } from "lucide-react";

function fmt(val: number, decimals = 2): string {
  return val ? val.toFixed(decimals) : "N/A";
}

function pct(val: number): string {
  return val ? `${(val * 100).toFixed(2)}%` : "N/A";
}

export default function DividendsTab({ data }: { data: QuoteSummaryData }) {
  const hasDividend = data.dividendRate > 0 || data.dividendYield > 0;

  if (!hasDividend) {
    return (
      <div className="text-center py-16 text-muted">
        <Banknote className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg mb-1">No Dividend Data</p>
        <p className="text-sm">
          This company does not currently pay a dividend.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-5 text-center">
          <Banknote className="h-5 w-5 mx-auto text-green mb-2" />
          <div className="text-xs text-muted mb-1">Annual Dividend</div>
          <div className="text-xl font-bold font-mono">
            ${fmt(data.dividendRate)}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 text-center">
          <Percent className="h-5 w-5 mx-auto text-accent mb-2" />
          <div className="text-xs text-muted mb-1">Dividend Yield</div>
          <div className="text-xl font-bold font-mono text-accent">
            {pct(data.dividendYield)}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 text-center">
          <div className="h-5 w-5 mx-auto text-muted mb-2 flex items-center justify-center text-xs font-bold">
            P/O
          </div>
          <div className="text-xs text-muted mb-1">Payout Ratio</div>
          <div
            className={`text-xl font-bold font-mono ${
              data.payoutRatio > 0.8
                ? "text-red"
                : data.payoutRatio > 0.6
                  ? "text-yellow-500"
                  : "text-green"
            }`}
          >
            {pct(data.payoutRatio)}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 text-center">
          <div className="h-5 w-5 mx-auto text-muted mb-2 flex items-center justify-center text-xs font-bold">
            5Y
          </div>
          <div className="text-xs text-muted mb-1">5Y Avg Yield</div>
          <div className="text-xl font-bold font-mono">
            {data.fiveYearAvgDividendYield
              ? `${fmt(data.fiveYearAvgDividendYield)}%`
              : "N/A"}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-5">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Dividend Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              label: "Ex-Dividend Date",
              value: data.exDividendDate || "N/A",
              icon: Calendar,
            },
            {
              label: "Dividend Pay Date",
              value: data.dividendPayDate || "N/A",
              icon: Calendar,
            },
            {
              label: "Trailing Annual Rate",
              value: data.trailingAnnualDividendRate
                ? `$${fmt(data.trailingAnnualDividendRate)}`
                : "N/A",
              icon: Banknote,
            },
            {
              label: "Trailing Annual Yield",
              value: data.trailingAnnualDividendYield
                ? pct(data.trailingAnnualDividendYield)
                : "N/A",
              icon: Percent,
            },
            {
              label: "Last Dividend Value",
              value: data.lastDividendValue
                ? `$${fmt(data.lastDividendValue)}`
                : "N/A",
              icon: Banknote,
            },
            {
              label: "Last Dividend Date",
              value: data.lastDividendDate || "N/A",
              icon: Calendar,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background text-sm"
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 text-muted" />
                <span className="text-muted">{item.label}</span>
              </div>
              <span className="font-mono font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

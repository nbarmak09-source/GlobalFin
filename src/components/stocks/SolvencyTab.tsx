"use client";

import type { QuoteSummaryData } from "@/lib/types";
import { Shield } from "lucide-react";

function formatLarge(value: number): string {
  if (!value) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function fmt(val: number, decimals = 2): string {
  return val ? val.toFixed(decimals) : "N/A";
}

function ratioColor(val: number, greenThreshold: number, redThreshold: number): string {
  if (!val) return "text-muted";
  if (val >= greenThreshold) return "text-green";
  if (val <= redThreshold) return "text-red";
  return "text-yellow-500";
}

export default function SolvencyTab({ data }: { data: QuoteSummaryData }) {
  const debtTotal = data.totalDebt + data.totalCash;
  const debtPct = debtTotal > 0 ? (data.totalDebt / debtTotal) * 100 : 50;
  const cashPct = debtTotal > 0 ? (data.totalCash / debtTotal) * 100 : 50;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border p-5 text-center">
          <div className="text-xs text-muted mb-1">Current Ratio</div>
          <div
            className={`text-2xl font-bold font-mono ${ratioColor(data.currentRatio, 1.5, 1)}`}
          >
            {fmt(data.currentRatio)}
          </div>
          <div className="text-xs text-muted mt-1">
            {data.currentRatio >= 1.5
              ? "Healthy"
              : data.currentRatio >= 1
                ? "Adequate"
                : "Concerning"}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 text-center">
          <div className="text-xs text-muted mb-1">Quick Ratio</div>
          <div
            className={`text-2xl font-bold font-mono ${ratioColor(data.quickRatio, 1, 0.5)}`}
          >
            {fmt(data.quickRatio)}
          </div>
          <div className="text-xs text-muted mt-1">
            {data.quickRatio >= 1
              ? "Healthy"
              : data.quickRatio >= 0.5
                ? "Adequate"
                : "Low"}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 text-center">
          <div className="text-xs text-muted mb-1">Debt / Equity</div>
          <div
            className={`text-2xl font-bold font-mono ${
              data.debtToEquity
                ? data.debtToEquity <= 100
                  ? "text-green"
                  : data.debtToEquity <= 200
                    ? "text-yellow-500"
                    : "text-red"
                : "text-muted"
            }`}
          >
            {data.debtToEquity ? fmt(data.debtToEquity) : "N/A"}
          </div>
          <div className="text-xs text-muted mt-1">
            {data.debtToEquity
              ? data.debtToEquity <= 100
                ? "Conservative"
                : data.debtToEquity <= 200
                  ? "Moderate"
                  : "Leveraged"
              : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Debt vs Cash
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-muted mb-1">Total Debt</div>
            <div className="text-lg font-bold font-mono text-red">
              {formatLarge(data.totalDebt)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted mb-1">Total Cash</div>
            <div className="text-lg font-bold font-mono text-green">
              {formatLarge(data.totalCash)}
            </div>
          </div>
        </div>

        <div className="flex h-6 rounded-full overflow-hidden bg-background">
          <div
            className="bg-red/70 transition-all"
            style={{ width: `${debtPct}%` }}
            title={`Debt: ${formatLarge(data.totalDebt)}`}
          />
          <div
            className="bg-green/70 transition-all"
            style={{ width: `${cashPct}%` }}
            title={`Cash: ${formatLarge(data.totalCash)}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted">
          <span>Debt ({debtPct.toFixed(0)}%)</span>
          <span>Cash ({cashPct.toFixed(0)}%)</span>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-5">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Cash Flow Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Operating Cash Flow", value: formatLarge(data.operatingCashflow) },
            { label: "Free Cash Flow", value: formatLarge(data.freeCashflow) },
            { label: "Cash Per Share", value: data.totalCashPerShare ? `$${fmt(data.totalCashPerShare)}` : "N/A" },
            { label: "Revenue Per Share", value: data.revenuePerShare ? `$${fmt(data.revenuePerShare)}` : "N/A" },
          ].map((m) => (
            <div
              key={m.label}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background text-sm"
            >
              <span className="text-muted">{m.label}</span>
              <span className="font-mono font-medium">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

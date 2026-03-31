"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Coins,
  Landmark,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import type { QuoteSummaryData } from "@/lib/types";
import { StockDataCitation } from "./StockDataCitation";

function formatLarge(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value) || value === 0) return "—";
  const v = Math.abs(value);
  if (v >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function pct(val: number | undefined | null): string {
  if (val == null || Number.isNaN(val)) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

interface HealthCheck {
  id: string;
  pass: boolean;
  skip: boolean;
  label: string;
  detail: string;
}

function buildFinancialHealthChecks(data: QuoteSummaryData): HealthCheck[] {
  const cr = data.currentRatio;
  const qr = data.quickRatio;
  const de = data.debtToEquity;
  const fcf = data.freeCashflow;
  const ocf = data.operatingCashflow;
  const cash = data.totalCash;
  const debt = data.totalDebt;

  const hasCr = cr > 0;
  const hasQr = qr > 0;
  const hasDe = de >= 0 && data.debtToEquity !== undefined;

  return [
    {
      id: "liquidity",
      skip: !hasCr,
      pass: hasCr && cr >= 1,
      label: "Liquidity (current ratio ≥ 1×)",
      detail: hasCr
        ? `Current ratio ${cr.toFixed(2)}× (from Yahoo financialData).`
        : "Current ratio not reported.",
    },
    {
      id: "quick",
      skip: !hasQr,
      pass: hasQr && qr >= 0.8,
      label: "Quick ratio (≥ 0.8×)",
      detail: hasQr
        ? `Quick ratio ${qr.toFixed(2)}×.`
        : "Quick ratio not reported.",
    },
    {
      id: "leverage",
      skip: !hasDe,
      pass: de < 1.5,
      label: "Moderate leverage (D/E under 1.5×)",
      detail: hasDe
        ? `Debt / equity ${de.toFixed(2)}×.`
        : "Debt/equity not reported.",
    },
    {
      id: "fcf",
      skip: false,
      pass: fcf > 0,
      label: "Positive free cash flow",
      detail: `TTM free cash flow ${fcf === 0 ? "$0" : formatLarge(fcf)}.`,
    },
    {
      id: "ocf",
      skip: false,
      pass: ocf > 0,
      label: "Positive operating cash flow",
      detail: `Operating cash flow ${ocf === 0 ? "$0" : formatLarge(ocf)}.`,
    },
    {
      id: "net-cash",
      skip: cash === 0 && debt === 0,
      pass: debt === 0 ? cash >= 0 : cash >= debt,
      label: "Net cash or cash ≥ total debt",
      detail:
        cash === 0 && debt === 0
          ? "Cash and debt not split out meaningfully."
          : `Cash ${formatLarge(cash)} vs total debt ${formatLarge(debt)}.`,
    },
  ];
}

function healthVerdict(checks: HealthCheck[]): {
  label: string;
  sub: string;
  tone: "strong" | "ok" | "weak" | "unknown";
  score: number;
  counted: number;
} {
  const active = checks.filter((c) => !c.skip);
  if (active.length === 0) {
    return {
      label: "Insufficient data",
      sub: "Not enough balance-sheet fields to score health.",
      tone: "unknown",
      score: 0,
      counted: 0,
    };
  }
  const passed = active.filter((c) => c.pass).length;
  const ratio = passed / active.length;
  if (ratio >= 0.75) {
    return {
      label: "Stronger financial health",
      sub: `${passed} of ${active.length} checks passed`,
      tone: "strong",
      score: Math.round(ratio * 100),
      counted: active.length,
    };
  }
  if (ratio >= 0.45) {
    return {
      label: "Mixed financial health",
      sub: `${passed} of ${active.length} checks passed`,
      tone: "ok",
      score: Math.round(ratio * 100),
      counted: active.length,
    };
  }
  return {
    label: "Weaker financial health",
    sub: `${passed} of ${active.length} checks passed`,
    tone: "weak",
    score: Math.round(ratio * 100),
    counted: active.length,
  };
}

export default function FinancialsTab({ data }: { data: QuoteSummaryData }) {
  const [chartView, setChartView] = useState<"yearly" | "quarterly">("yearly");

  const chartData =
    chartView === "yearly"
      ? data.financialsChartYearly
      : data.financialsChartQuarterly;

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  const healthChecks = buildFinancialHealthChecks(data);
  const verdict = healthVerdict(healthChecks);

  const profitabilityMetrics = [
    { label: "Gross margin", value: pct(data.grossMargins) },
    { label: "EBITDA margin", value: pct(data.ebitdaMargins) },
    { label: "Operating margin", value: pct(data.operatingMargins) },
    { label: "Net margin", value: pct(data.profitMargins) },
    { label: "Return on assets", value: pct(data.returnOnAssets) },
    { label: "Return on equity", value: pct(data.returnOnEquity) },
  ];

  const growthMetrics = [
    { label: "Revenue growth (YoY)", value: pct(data.revenueGrowth) },
    { label: "Earnings growth (YoY)", value: pct(data.earningsGrowth) },
  ];

  const incomeMetrics = [
    { label: "Total revenue", value: formatLarge(data.totalRevenue) },
    { label: "Gross profit", value: formatLarge(data.grossProfits) },
    { label: "EBITDA", value: formatLarge(data.ebitda) },
    { label: "Operating cash flow", value: formatLarge(data.operatingCashflow) },
    { label: "Free cash flow", value: formatLarge(data.freeCashflow) },
  ];

  const balanceMetrics = [
    { label: "Total cash", value: formatLarge(data.totalCash) },
    { label: "Total debt", value: formatLarge(data.totalDebt) },
    {
      label: "Debt / equity",
      value:
        data.debtToEquity >= 0 ? `${data.debtToEquity.toFixed(2)}×` : "—",
    },
    {
      label: "Current ratio",
      value: data.currentRatio > 0 ? `${data.currentRatio.toFixed(2)}×` : "—",
    },
    {
      label: "Quick ratio",
      value: data.quickRatio > 0 ? `${data.quickRatio.toFixed(2)}×` : "—",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Financial health — Simply Wall St–style */}
      <section className="rounded-2xl border border-border bg-gradient-to-b from-card to-background overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-border/80">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent shrink-0" />
                Financial health
              </h2>
              <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
                Automated checks on liquidity, leverage, and cash generation using{" "}
                <strong className="text-foreground">Yahoo Finance</strong>{" "}
                <code className="text-[11px] text-accent/90">financialData</code> fields
                (see data sources below). Rules are simplified and not a substitute for
                audited statements.
              </p>
            </div>
            <div
              className={`shrink-0 rounded-xl px-4 py-3 border text-center min-w-[160px] ${
                verdict.tone === "strong"
                  ? "border-green/40 bg-green/10 text-green"
                  : verdict.tone === "ok"
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : verdict.tone === "weak"
                      ? "border-red/40 bg-red/10 text-red"
                      : "border-border bg-card-hover text-muted"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1">
                Summary
              </p>
              <p className="text-sm font-semibold text-foreground leading-snug">
                {verdict.label}
              </p>
              {verdict.counted > 0 && (
                <p className="text-xs font-mono mt-1 tabular-nums opacity-90">
                  ~{verdict.score}% · {verdict.sub}
                </p>
              )}
              {verdict.counted === 0 && (
                <p className="text-xs mt-1 opacity-90">{verdict.sub}</p>
              )}
            </div>
          </div>

          {verdict.counted > 0 && (
            <div className="mt-6 h-2 rounded-full bg-background border border-border overflow-hidden flex">
              {healthChecks
                .filter((c) => !c.skip)
                .map((c) => (
                  <div
                    key={c.id}
                    className={`flex-1 border-r border-background last:border-r-0 ${
                      c.pass ? "bg-green/70" : "bg-red/50"
                    }`}
                    title={c.label}
                  />
                ))}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {healthChecks.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-4 flex gap-3 ${
                c.skip
                  ? "border-border/60 bg-card/50 opacity-80"
                  : c.pass
                    ? "border-green/30 bg-green/5"
                    : "border-border bg-card"
              }`}
            >
              {c.skip ? (
                <AlertCircle className="h-5 w-5 text-muted shrink-0 mt-0.5" />
              ) : c.pass ? (
                <CheckCircle2 className="h-5 w-5 text-green shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-muted shrink-0 mt-0.5 opacity-80" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {c.label}
                  {c.skip && (
                    <span className="text-muted font-normal"> (n/a)</span>
                  )}
                </p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue & earnings trend */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Revenue &amp; earnings trend
            </h3>
            <p className="text-xs text-muted mt-1">
              From Yahoo <code className="text-[11px]">earnings.financialsChart</code>{" "}
              (annual or quarterly).
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-background border border-border p-0.5">
            {(["yearly", "quarterly"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setChartView(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  chartView === v
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {v === "yearly" ? "Annual" : "Quarterly"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">
              No revenue / earnings history returned for this symbol.
            </div>
          ) : (
            <div className="space-y-4">
              {chartData.map((entry, idx) => {
                const revPct = (entry.revenue / maxRevenue) * 100;
                const earnPct =
                  maxRevenue > 0
                    ? (Math.abs(entry.earnings) / maxRevenue) * 100
                    : 0;
                const isNegativeEarnings = entry.earnings < 0;

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/80 bg-background/40 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                      <span className="text-sm font-semibold text-foreground">
                        {String(entry.date)}
                      </span>
                      <div className="flex flex-wrap gap-4 text-xs font-mono tabular-nums">
                        <span>
                          Revenue:{" "}
                          <span className="text-foreground">
                            {formatLarge(entry.revenue)}
                          </span>
                        </span>
                        <span className={isNegativeEarnings ? "text-red" : "text-green"}>
                          Earnings: {formatLarge(entry.earnings)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full bg-card border border-border overflow-hidden">
                        <div
                          className="h-full bg-accent/70 rounded-full transition-all"
                          style={{ width: `${revPct}%` }}
                        />
                      </div>
                      <div className="h-1.5 rounded-full bg-card border border-border overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isNegativeEarnings ? "bg-red/70" : "bg-green/70"
                          }`}
                          style={{ width: `${Math.min(earnPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-6 text-xs text-muted pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-2 rounded-full bg-accent/70" />
                  <span>Revenue (scaled to largest period)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-2 rounded-full bg-green/70" />
                  <span>Earnings (vs revenue scale)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* EPS actual vs estimate */}
      {data.earningsChartQuarterly.length > 0 && (
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-border/80">
            <h3 className="text-sm font-semibold text-foreground">
              EPS — actual vs estimate
            </h3>
            <p className="text-xs text-muted mt-1">
              From Yahoo <code className="text-[11px]">earnings.earningsChart</code>.
            </p>
          </div>
          <div className="overflow-x-auto p-2 sm:p-4">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                  <th className="text-left py-3 px-3">Quarter</th>
                  <th className="text-right py-3 px-3">Estimate</th>
                  <th className="text-right py-3 px-3">Actual</th>
                  <th className="text-right py-3 px-3">Surprise</th>
                </tr>
              </thead>
              <tbody>
                {data.earningsChartQuarterly.map((q, idx) => {
                  const surprise =
                    q.actual != null ? q.actual - q.estimate : null;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-border/50 hover:bg-card-hover/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium">{q.date}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ${q.estimate.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {q.actual != null ? `$${q.actual.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {surprise != null ? (
                          <span
                            className={
                              surprise >= 0 ? "text-green" : "text-red"
                            }
                          >
                            {surprise >= 0 ? (
                              <ArrowUpRight className="inline h-3.5 w-3.5 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="inline h-3.5 w-3.5 mr-0.5" />
                            )}
                            {surprise >= 0 ? "+" : ""}${surprise.toFixed(2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Income + balance */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            Income &amp; cash generation
          </h3>
          <p className="text-xs text-muted mb-4">
            <code className="text-[11px]">financialData</code> totals (TTM-style where
            provided).
          </p>
          <dl className="space-y-2 text-sm">
            {incomeMetrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg bg-background border border-border/70"
              >
                <dt className="text-muted">{m.label}</dt>
                <dd className="font-mono font-medium tabular-nums">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-accent" />
            Balance sheet &amp; liquidity
          </h3>
          <p className="text-xs text-muted mb-4">
            Cash, debt, and coverage ratios from{" "}
            <code className="text-[11px]">financialData</code>.
          </p>
          <dl className="space-y-2 text-sm">
            {balanceMetrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg bg-background border border-border/70"
              >
                <dt className="text-muted">{m.label}</dt>
                <dd className="font-mono font-medium tabular-nums">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Profitability & growth */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Profitability
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {profitabilityMetrics.map((m) => (
              <div
                key={m.label}
                className="rounded-lg bg-background border border-border px-3 py-2.5"
              >
                <p className="text-xs text-muted mb-0.5">{m.label}</p>
                <p className="font-mono font-semibold tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            Growth
          </h3>
          <div className="space-y-2">
            {growthMetrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between gap-4 py-3 px-3 rounded-lg bg-background border border-border"
              >
                <span className="text-sm text-muted">{m.label}</span>
                <span className="font-mono font-semibold tabular-nums">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StockDataCitation tab="financials" />
    </div>
  );
}

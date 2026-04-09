"use client";

import { useState, useEffect, useMemo } from "react";
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
  ExternalLink,
} from "lucide-react";
import type { QuoteSummaryData, SECFinancials } from "@/lib/types";
import { getEdgarFilingUrl } from "@/lib/edgar";
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

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

function firstRecord(rows: unknown[] | undefined): Record<string, unknown> | undefined {
  const r = rows?.[0];
  if (r && typeof r === "object" && !Array.isArray(r)) {
    return r as Record<string, unknown>;
  }
  return undefined;
}

/** Treat 0 as missing for headline totals (Yahoo often sends 0 when absent). */
function yahooTotalMissing(v: number | undefined | null): boolean {
  return v == null || Number.isNaN(v) || v === 0;
}

interface FmpFinancialsPayload {
  symbol: string;
  incomeStatement: {
    data: unknown[];
    _source: "FMP";
    _sourceUrl: string;
  } | null;
  balanceSheet: {
    data: unknown[];
    _source: "FMP";
    _sourceUrl: string;
  } | null;
  keyMetrics: {
    data: unknown[];
    _source: "FMP";
    _sourceUrl: string;
  } | null;
}

function FmpSourceBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent shrink-0">
      Source: FMP
    </span>
  );
}

function FmpMetricRow({
  label,
  yahooDisplay,
  fmpDisplay,
  yahooIncomplete,
}: {
  label: string;
  yahooDisplay: string;
  fmpDisplay: string | null;
  yahooIncomplete: boolean;
}) {
  const fmpOk = fmpDisplay != null && fmpDisplay !== "—";
  const showFmpPrimary = yahooIncomplete && fmpOk;
  const showCompare = !yahooIncomplete && fmpOk;

  return (
    <div className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg bg-background border border-border/70">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right min-w-0">
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="font-mono font-medium tabular-nums">
              {showFmpPrimary ? fmpDisplay : yahooDisplay}
            </span>
            {showFmpPrimary && <FmpSourceBadge />}
          </div>
          {showCompare && (
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted">
              <span className="font-mono tabular-nums">FMP: {fmpDisplay}</span>
              <FmpSourceBadge />
            </div>
          )}
        </div>
      </dd>
    </div>
  );
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

/** FMP often returns margins as decimals; sometimes as whole percentages. */
function fmpMarginToFraction(v: number | undefined): number | undefined {
  if (v == null || !Number.isFinite(v)) return undefined;
  if (Math.abs(v) <= 1) return v;
  return v / 100;
}

function deriveFmpSnapshot(payload: FmpFinancialsPayload | null) {
  if (!payload) return null;
  const hasAny =
    (payload.incomeStatement?.data?.length ?? 0) > 0 ||
    (payload.balanceSheet?.data?.length ?? 0) > 0 ||
    (payload.keyMetrics?.data?.length ?? 0) > 0;
  if (!hasAny) return null;
  const inc = firstRecord(payload.incomeStatement?.data);
  const bal = firstRecord(payload.balanceSheet?.data);
  const km = firstRecord(payload.keyMetrics?.data);

  const shares = pickNumber(inc ?? {}, [
    "weightedAverageShsOutDil",
    "weightedAverageShsOut",
  ]);

  const revenue = pickNumber(inc ?? {}, ["revenue"]);
  const grossProfit = pickNumber(inc ?? {}, ["grossProfit"]);
  const ebitda = pickNumber(inc ?? {}, ["ebitda"]);

  const cash = pickNumber(bal ?? {}, [
    "cashAndCashEquivalents",
    "cashAndShortTermInvestments",
  ]);
  const totalDebt = pickNumber(bal ?? {}, ["totalDebt"]);

  const ocfPerShare = pickNumber(km ?? {}, [
    "operatingCashFlowPerShareTTM",
    "operatingCashFlowPerShare",
  ]);
  const fcfPerShare = pickNumber(km ?? {}, [
    "freeCashFlowPerShareTTM",
    "freeCashFlowPerShare",
  ]);
  const operatingCashflow =
    shares != null && ocfPerShare != null ? shares * ocfPerShare : undefined;
  const freeCashflow =
    shares != null && fcfPerShare != null ? shares * fcfPerShare : undefined;

  const debtToEquity = pickNumber(km ?? {}, [
    "debtToEquityRatioTTM",
    "debtToEquityRatio",
  ]);
  const currentRatio = pickNumber(km ?? {}, [
    "currentRatioTTM",
    "currentRatio",
  ]);
  const quickRatio = pickNumber(km ?? {}, ["quickRatioTTM", "quickRatio"]);

  const grossMargins = fmpMarginToFraction(
    pickNumber(km ?? {}, ["grossProfitMarginTTM", "grossProfitMargin"])
  );
  const ebitdaMargins = fmpMarginToFraction(
    pickNumber(km ?? {}, ["ebitdaMarginTTM", "ebitdaMargin"])
  );
  const operatingMargins = fmpMarginToFraction(
    pickNumber(km ?? {}, [
      "operatingProfitMarginTTM",
      "operatingProfitMargin",
    ])
  );
  const profitMargins = fmpMarginToFraction(
    pickNumber(km ?? {}, ["netProfitMarginTTM", "netProfitMargin"])
  );
  const returnOnAssets = fmpMarginToFraction(
    pickNumber(km ?? {}, ["returnOnAssetsTTM", "returnOnAssets"])
  );
  const returnOnEquity = fmpMarginToFraction(
    pickNumber(km ?? {}, ["returnOnEquityTTM", "returnOnEquity"])
  );

  const revenueGrowth = fmpMarginToFraction(
    pickNumber(km ?? {}, ["revenueGrowthTTM", "revenueGrowth"])
  );
  const earningsGrowth = fmpMarginToFraction(
    pickNumber(km ?? {}, [
      "epsgrowthTTM",
      "epsGrowthTTM",
      "netIncomeGrowthTTM",
    ])
  );

  return {
    revenue,
    grossProfit,
    ebitda,
    operatingCashflow,
    freeCashflow,
    cash,
    totalDebt,
    debtToEquity,
    currentRatio,
    quickRatio,
    grossMargins,
    ebitdaMargins,
    operatingMargins,
    profitMargins,
    returnOnAssets,
    returnOnEquity,
    revenueGrowth,
    earningsGrowth,
  };
}

export default function FinancialsTab({ data }: { data: QuoteSummaryData }) {
  const [chartView, setChartView] = useState<"yearly" | "quarterly">("yearly");
  const [fmpPayload, setFmpPayload] = useState<FmpFinancialsPayload | null>(null);
  const [secMeta, setSecMeta] = useState<Pick<SECFinancials, "cik"> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const sym = data.symbol?.trim();
    if (!sym) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/fmp/financials?symbol=${encodeURIComponent(sym)}`
        );
        if (!res.ok) return;
        const json: FmpFinancialsPayload = await res.json();
        if (!cancelled) setFmpPayload(json);
      } catch {
        if (!cancelled) setFmpPayload(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.symbol]);

  useEffect(() => {
    let cancelled = false;
    const sym = data.symbol?.trim();
    if (!sym) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/sec-financials?symbol=${encodeURIComponent(sym)}`,
        );
        if (!res.ok) {
          if (!cancelled) setSecMeta(null);
          return;
        }
        const json: SECFinancials = await res.json();
        if (!cancelled && json.cik) {
          setSecMeta({ cik: json.cik });
        } else if (!cancelled) {
          setSecMeta(null);
        }
      } catch {
        if (!cancelled) setSecMeta(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.symbol]);

  const fmp = useMemo(() => deriveFmpSnapshot(fmpPayload), [fmpPayload]);

  const chartData =
    chartView === "yearly"
      ? data.financialsChartYearly
      : data.financialsChartQuarterly;

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  const healthChecks = buildFinancialHealthChecks(data);
  const verdict = healthVerdict(healthChecks);

  const debtYahooIncomplete = !(
    data.debtToEquity >= 0 && data.debtToEquity !== undefined
  );
  const currentYahooIncomplete = !(data.currentRatio > 0);
  const quickYahooIncomplete = !(data.quickRatio > 0);

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
        {secMeta?.cik && (
          <div className="lg:col-span-2 flex flex-wrap items-center justify-end gap-2">
            <a
              href={getEdgarFilingUrl(secMeta.cik)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-card-hover transition-colors"
            >
              View SEC Filing
              <ExternalLink className="h-3.5 w-3.5 text-muted shrink-0" />
            </a>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            Income &amp; cash generation
          </h3>
          <p className="text-xs text-muted mb-4">
            <code className="text-[11px]">financialData</code> totals (TTM-style where
            provided).
            {fmp && (
              <>
                {" "}
                FMP statement and TTM metrics supplement missing Yahoo fields.
              </>
            )}
          </p>
          <dl className="space-y-2 text-sm">
            <FmpMetricRow
              label="Total revenue"
              yahooDisplay={formatLarge(data.totalRevenue)}
              fmpDisplay={
                fmp?.revenue != null ? formatLarge(fmp.revenue) : null
              }
              yahooIncomplete={yahooTotalMissing(data.totalRevenue)}
            />
            <FmpMetricRow
              label="Gross profit"
              yahooDisplay={formatLarge(data.grossProfits)}
              fmpDisplay={
                fmp?.grossProfit != null ? formatLarge(fmp.grossProfit) : null
              }
              yahooIncomplete={yahooTotalMissing(data.grossProfits)}
            />
            <FmpMetricRow
              label="EBITDA"
              yahooDisplay={formatLarge(data.ebitda)}
              fmpDisplay={fmp?.ebitda != null ? formatLarge(fmp.ebitda) : null}
              yahooIncomplete={yahooTotalMissing(data.ebitda)}
            />
            <FmpMetricRow
              label="Operating cash flow"
              yahooDisplay={formatLarge(data.operatingCashflow)}
              fmpDisplay={
                fmp?.operatingCashflow != null
                  ? formatLarge(fmp.operatingCashflow)
                  : null
              }
              yahooIncomplete={yahooTotalMissing(data.operatingCashflow)}
            />
            <FmpMetricRow
              label="Free cash flow"
              yahooDisplay={formatLarge(data.freeCashflow)}
              fmpDisplay={
                fmp?.freeCashflow != null ? formatLarge(fmp.freeCashflow) : null
              }
              yahooIncomplete={yahooTotalMissing(data.freeCashflow)}
            />
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-accent" />
            Balance sheet &amp; liquidity
          </h3>
          <p className="text-xs text-muted mb-4">
            Cash, debt, and coverage ratios from{" "}
            <code className="text-[11px]">financialData</code>
            {fmp && (
              <>
                ; FMP supplements when Yahoo data is incomplete (
                <a
                  href={
                    fmpPayload?.balanceSheet?._sourceUrl ??
                    `https://financialmodelingprep.com/financial-statements/${encodeURIComponent(data.symbol)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  statements
                </a>
                ).
              </>
            )}
          </p>
          <dl className="space-y-2 text-sm">
            <FmpMetricRow
              label="Total cash"
              yahooDisplay={formatLarge(data.totalCash)}
              fmpDisplay={fmp?.cash != null ? formatLarge(fmp.cash) : null}
              yahooIncomplete={yahooTotalMissing(data.totalCash)}
            />
            <FmpMetricRow
              label="Total debt"
              yahooDisplay={formatLarge(data.totalDebt)}
              fmpDisplay={
                fmp?.totalDebt != null ? formatLarge(fmp.totalDebt) : null
              }
              yahooIncomplete={yahooTotalMissing(data.totalDebt)}
            />
            <FmpMetricRow
              label="Debt / equity"
              yahooDisplay={
                data.debtToEquity >= 0
                  ? `${data.debtToEquity.toFixed(2)}×`
                  : "—"
              }
              fmpDisplay={
                fmp?.debtToEquity != null && fmp.debtToEquity >= 0
                  ? `${fmp.debtToEquity.toFixed(2)}×`
                  : null
              }
              yahooIncomplete={debtYahooIncomplete}
            />
            <FmpMetricRow
              label="Current ratio"
              yahooDisplay={
                data.currentRatio > 0 ? `${data.currentRatio.toFixed(2)}×` : "—"
              }
              fmpDisplay={
                fmp?.currentRatio != null && fmp.currentRatio > 0
                  ? `${fmp.currentRatio.toFixed(2)}×`
                  : null
              }
              yahooIncomplete={currentYahooIncomplete}
            />
            <FmpMetricRow
              label="Quick ratio"
              yahooDisplay={
                data.quickRatio > 0 ? `${data.quickRatio.toFixed(2)}×` : "—"
              }
              fmpDisplay={
                fmp?.quickRatio != null && fmp.quickRatio > 0
                  ? `${fmp.quickRatio.toFixed(2)}×`
                  : null
              }
              yahooIncomplete={quickYahooIncomplete}
            />
          </dl>
        </div>

        <p className="lg:col-span-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          <span>
            Financial data sourced from{" "}
            <a
              href="https://www.sec.gov/cgi-bin/browse-edgar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline-offset-2 hover:underline hover:text-foreground transition-colors"
            >
              SEC EDGAR filings
            </a>
          </span>
        </p>
      </section>

      {/* Profitability & growth */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Profitability
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                ["Gross margin", data.grossMargins, fmp?.grossMargins] as const,
                ["EBITDA margin", data.ebitdaMargins, fmp?.ebitdaMargins] as const,
                [
                  "Operating margin",
                  data.operatingMargins,
                  fmp?.operatingMargins,
                ] as const,
                ["Net margin", data.profitMargins, fmp?.profitMargins] as const,
                ["Return on assets", data.returnOnAssets, fmp?.returnOnAssets] as const,
                ["Return on equity", data.returnOnEquity, fmp?.returnOnEquity] as const,
              ] as const
            ).map(([label, yahooVal, fmpV]) => {
              const yInc =
                yahooVal == null || Number.isNaN(yahooVal);
              const fmpStr =
                fmpV != null && Number.isFinite(fmpV) ? pct(fmpV) : null;
              return (
                <div
                  key={label}
                  className="rounded-lg bg-background border border-border px-3 py-2.5"
                >
                  <p className="text-xs text-muted mb-0.5">{label}</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono font-semibold tabular-nums">
                        {yInc && fmpStr ? fmpStr : pct(yahooVal)}
                      </p>
                      {yInc && fmpStr && <FmpSourceBadge />}
                    </div>
                    {!yInc && fmpStr && (
                      <p className="text-[11px] text-muted font-mono tabular-nums flex flex-wrap items-center gap-2">
                        FMP: {fmpStr}
                        <FmpSourceBadge />
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            Growth
          </h3>
          <div className="space-y-2">
            {(
              [
                ["Revenue growth (YoY)", data.revenueGrowth, fmp?.revenueGrowth] as const,
                [
                  "Earnings growth (YoY)",
                  data.earningsGrowth,
                  fmp?.earningsGrowth,
                ] as const,
              ] as const
            ).map(([label, yahooVal, fmpV]) => {
              const yInc =
                yahooVal == null || Number.isNaN(yahooVal);
              const fmpStr =
                fmpV != null && Number.isFinite(fmpV) ? pct(fmpV) : null;
              return (
                <div
                  key={label}
                  className="flex flex-col gap-1 py-3 px-3 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted">{label}</span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="font-mono font-semibold tabular-nums">
                        {yInc && fmpStr ? fmpStr : pct(yahooVal)}
                      </span>
                      {yInc && fmpStr && <FmpSourceBadge />}
                    </div>
                  </div>
                  {!yInc && fmpStr && (
                    <p className="text-[11px] text-muted font-mono tabular-nums text-right flex flex-wrap items-center justify-end gap-2">
                      FMP: {fmpStr}
                      <FmpSourceBadge />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <StockDataCitation tab="financials" />
    </div>
  );
}

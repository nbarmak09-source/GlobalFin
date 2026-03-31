"use client";

import type { QuoteSummaryData } from "@/lib/types";
import Link from "next/link";
import { StockDataCitation } from "./StockDataCitation";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Info,
  BarChart3,
  Percent,
  Scale,
  Target,
  Wallet,
} from "lucide-react";

function fmt(val: number | undefined | null, decimals = 2): string {
  if (val == null || Number.isNaN(val)) return "—";
  return val.toFixed(decimals);
}

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

/** Map a value into 0–100 for “cheap ← → expensive” heuristic bars (higher multiple = more to the right). */
function multipleBarPosition(
  value: number | undefined | null,
  cap: number
): number | null {
  if (value == null || Number.isNaN(value) || value <= 0) return null;
  return Math.min(100, Math.max(0, (value / cap) * 100));
}

interface CheckItem {
  id: string;
  pass: boolean;
  label: string;
  detail: string;
}

function buildChecks(data: QuoteSummaryData, price: number): CheckItem[] {
  const mean = data.targetMeanPrice;
  const median = data.targetMedianPrice;
  const low = data.targetLowPrice;
  const high = data.targetHighPrice;
  const pe = data.trailingPE;

  return [
    {
      id: "below-mean",
      pass: mean > 0 && price > 0 && price < mean,
      label: "Below analyst consensus",
      detail:
        mean > 0
          ? "Share price is under the mean analyst target."
          : "No analyst mean target available.",
    },
    {
      id: "discount-20",
      pass: mean > 0 && price > 0 && price <= mean * 0.8,
      label: "20%+ discount to mean target",
      detail:
        mean > 0
          ? "Price is at least 20% below the mean target."
          : "No analyst mean target available.",
    },
    {
      id: "below-median",
      pass:
        median > 0 && price > 0 && price < median,
      label: "Below median target",
      detail:
        median > 0
          ? "Trading below the median analyst price target."
          : "No median target available.",
    },
    {
      id: "in-range",
      pass:
        low > 0 &&
        high > 0 &&
        price > 0 &&
        price >= low &&
        price <= high,
      label: "Within analyst range",
      detail:
        low > 0 && high > 0
          ? "Price sits between low and high analyst estimates."
          : "Analyst range not available.",
    },
    {
      id: "earnings",
      pass: (data.trailingEps ?? 0) > 0,
      label: "Profitable (positive EPS)",
      detail: "Trailing EPS is positive.",
    },
    {
      id: "pe-sane",
      pass: pe > 0 && pe < 80,
      label: "P/E not extreme",
      detail:
        pe > 0
          ? `Trailing P/E is ${pe.toFixed(1)}× (flagged if ≥ 80×).`
          : "P/E not meaningful for this name.",
    },
  ];
}

function AnalystRangeBar({
  low,
  high,
  mean,
  median,
  current,
  currency,
}: {
  low: number;
  high: number;
  mean: number;
  median: number;
  current: number;
  currency: string;
}) {
  const min = Math.min(low, current, mean, median > 0 ? median : mean);
  const max = Math.max(high, current, mean, median > 0 ? median : mean);
  const span = max - min || 1;
  const pos = (v: number) => ((v - min) / span) * 100;

  const markers = [
    { v: low, label: "Low", className: "bg-muted" },
    ...(median > 0 ? [{ v: median, label: "Median", className: "bg-accent/80" }] : []),
    { v: mean, label: "Mean", className: "bg-accent" },
    { v: high, label: "High", className: "bg-muted" },
    { v: current, label: "Now", className: "bg-foreground" },
  ].sort((a, b) => a.v - b.v);

  return (
    <div className="space-y-3">
      <div className="relative h-14 rounded-lg bg-background border border-border overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 right-0 opacity-30"
          style={{
            background: `linear-gradient(90deg, 
              rgb(16 185 129 / 0.25) 0%, 
              rgb(201 162 39 / 0.2) 50%, 
              rgb(220 38 38 / 0.2) 100%)`,
          }}
        />
        {/* Track line */}
        <div className="absolute top-1/2 left-3 right-3 h-0.5 -translate-y-1/2 bg-border rounded-full" />
        {markers.map((m, i) => (
          <div
            key={`${m.label}-${i}`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex flex-col items-center"
            style={{ left: `${pos(m.v)}%` }}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full border-2 border-card shadow ${m.className}`}
              title={`${m.label}: ${currency}${m.v.toFixed(2)}`}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted justify-center">
        {[
          ["Low", low],
          median > 0 ? ["Median", median] : null,
          ["Mean", mean],
          ["High", high],
          ["Current", current],
        ]
          .filter((x): x is [string, number] => x != null)
          .map(([label, val]) => (
            <span key={label} className="font-mono tabular-nums">
              <span className="text-muted">{label}: </span>
              <span className="text-foreground">
                {currency}
                {val.toFixed(2)}
              </span>
            </span>
          ))}
      </div>
    </div>
  );
}

function RelativeMetricBar({
  label,
  value,
  suffix,
  position,
}: {
  label: string;
  value: string;
  suffix?: string;
  position: number | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-mono font-semibold tabular-nums">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      {position == null ? (
        <p className="text-xs text-muted">Not comparable</p>
      ) : (
        <>
          <div className="relative h-2 rounded-full bg-background border border-border overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green/40 via-accent/30 to-red/40"
              style={{ width: "100%" }}
            />
            <div
              className="absolute top-1/2 h-3 w-1 -translate-y-1/2 -translate-x-1/2 rounded-sm bg-foreground shadow"
              style={{ left: `${position}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted mt-1 uppercase tracking-wide">
            <span>Lower multiple</span>
            <span>Higher multiple</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function ValuationTab({ data }: { data: QuoteSummaryData }) {
  const price = data.regularMarketPrice || 0;
  const currency = data.currency === "USD" ? "$" : `${data.currency} `;

  const meanTarget = data.targetMeanPrice || 0;
  const medianTarget = data.targetMedianPrice || 0;
  const lowTarget = data.targetLowPrice || 0;
  const highTarget = data.targetHighPrice || 0;

  /** Fair value proxy: analyst consensus (not a DCF). */
  const fairValue = meanTarget;
  const discountToFair =
    price > 0 && fairValue > 0
      ? ((fairValue - price) / fairValue) * 100
      : null;
  const upsideFromPrice =
    price > 0 && meanTarget > 0
      ? ((meanTarget - price) / price) * 100
      : null;

  let verdict: "undervalued" | "fair" | "overvalued" | "unknown" = "unknown";
  if (price > 0 && fairValue > 0) {
    const d = (price - fairValue) / fairValue;
    if (d < -0.05) verdict = "undervalued";
    else if (d > 0.05) verdict = "overvalued";
    else verdict = "fair";
  }

  const checks = buildChecks(data, price);

  const pePos = multipleBarPosition(data.trailingPE, 45);
  const pbPos = multipleBarPosition(data.priceToBook, 8);
  const evEbitdaPos = multipleBarPosition(
    data.enterpriseToEbitda,
    25
  );
  const psPos = multipleBarPosition(
    data.priceToSalesTrailing12Months,
    15
  );

  const fcfPerShare =
    data.freeCashflow && data.sharesOutstanding
      ? data.freeCashflow / data.sharesOutstanding
      : null;

  const showAnalystBar =
    lowTarget > 0 && highTarget > 0 && meanTarget > 0 && price > 0;

  return (
    <div className="space-y-8">
      {/* Fair value hero — Simply Wall St–style headline + comparison */}
      <section className="rounded-2xl border border-border bg-gradient-to-b from-card to-background overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-border/80">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-semibold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-accent shrink-0" />
                Share price vs fair value
              </h2>
              <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">
                Fair value here uses the{" "}
                <strong className="text-foreground">analyst consensus mean target</strong>{" "}
                as a proxy (not a discounted cash flow model). Use{" "}
                <Link
                  href={`/models?symbol=${encodeURIComponent(data.symbol)}&tab=DCF`}
                  className="text-accent hover:underline"
                >
                  Financial Models
                </Link>{" "}
                to build your own intrinsic value.
              </p>
            </div>
            {fairValue > 0 && price > 0 && (
              <div
                className={`shrink-0 rounded-xl px-4 py-3 border text-center min-w-[140px] ${
                  verdict === "undervalued"
                    ? "border-green/40 bg-green/10 text-green"
                    : verdict === "overvalued"
                      ? "border-red/40 bg-red/10 text-red"
                      : "border-border bg-card-hover text-foreground"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted mb-1">
                  Verdict
                </p>
                <p className="text-sm font-semibold">
                  {verdict === "undervalued" && "Looks undervalued"}
                  {verdict === "fair" && "Near fair value"}
                  {verdict === "overvalued" && "Looks rich vs target"}
                  {verdict === "unknown" && "—"}
                </p>
                {discountToFair != null && (
                  <p className="text-xs font-mono mt-1 tabular-nums opacity-90">
                    {discountToFair >= 0 ? (
                      <>
                        {discountToFair.toFixed(1)}% below target
                      </>
                    ) : (
                      <>
                        {Math.abs(discountToFair).toFixed(1)}% above target
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                Current share price
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums tracking-tight">
                {currency}
                {price.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-accent/20">
              <p className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                Fair value (analyst mean)
                <span
                  className="inline-flex"
                  title="Consensus price target, not a DCF"
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums tracking-tight text-accent">
                {fairValue > 0 ? (
                  <>
                    {currency}
                    {fairValue.toFixed(2)}
                  </>
                ) : (
                  <span className="text-muted text-xl">No consensus</span>
                )}
              </p>
              {upsideFromPrice != null && meanTarget > 0 && (
                <p
                  className={`text-sm font-mono mt-2 tabular-nums ${
                    upsideFromPrice >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {upsideFromPrice >= 0 ? "+" : ""}
                  {upsideFromPrice.toFixed(1)}% implied vs current
                </p>
              )}
            </div>
          </div>

          {/* Simple comparison bar: price vs fair */}
          {fairValue > 0 && price > 0 && (
            <div className="mt-8">
              <p className="text-xs text-muted mb-2 uppercase tracking-wider">
                Price vs analyst fair value
              </p>
              <div className="relative h-12 rounded-xl bg-background border border-border overflow-hidden">
                {(() => {
                  const lo = Math.min(price, fairValue) * 0.97;
                  const hi = Math.max(price, fairValue) * 1.03;
                  const span = hi - lo || 1;
                  const pPrice = ((price - lo) / span) * 100;
                  const pFair = ((fairValue - lo) / span) * 100;
                  return (
                    <>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-border"
                        style={{
                          left: "4%",
                          right: "4%",
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5"
                        style={{ left: `${4 + (pPrice / 100) * 92}%` }}
                      >
                        <span className="text-[10px] text-muted font-medium">
                          Price
                        </span>
                        <div className="w-3 h-3 rounded-full bg-foreground ring-2 ring-card" />
                      </div>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5"
                        style={{ left: `${4 + (pFair / 100) * 92}%` }}
                      >
                        <span className="text-[10px] text-accent font-medium">
                          Fair
                        </span>
                        <div className="w-3 h-3 rounded-full bg-accent ring-2 ring-card" />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Six valuation checks — snowflake-style */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Scale className="h-4 w-4 text-accent" />
          Valuation checks
        </h3>
        <p className="text-xs text-muted mb-4 max-w-2xl">
          Six quick tests inspired by relative and consensus-based valuation (not
          identical to Simply Wall St’s DCF checks).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {checks.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-4 flex gap-3 ${
                c.pass
                  ? "border-green/30 bg-green/5"
                  : "border-border bg-card"
              }`}
            >
              {c.pass ? (
                <CheckCircle2 className="h-5 w-5 text-green shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-muted shrink-0 mt-0.5 opacity-70" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {c.label}
                </p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Relative valuation — multiple “gauges” */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Percent className="h-4 w-4 text-accent" />
          Relative valuation
        </h3>
        <p className="text-xs text-muted mb-4">
          Heuristic scales (not peer-relative): higher position = higher multiple vs
          a rough cap. Use for context only.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RelativeMetricBar
            label="P/E (TTM)"
            value={fmt(data.trailingPE)}
            suffix="×"
            position={pePos}
          />
          <RelativeMetricBar
            label="P/B"
            value={fmt(data.priceToBook)}
            suffix="×"
            position={pbPos}
          />
          <RelativeMetricBar
            label="EV / EBITDA"
            value={fmt(data.enterpriseToEbitda)}
            suffix="×"
            position={evEbitdaPos}
          />
          <RelativeMetricBar
            label="P/S (TTM)"
            value={fmt(data.priceToSalesTrailing12Months)}
            suffix="×"
            position={psPos}
          />
        </div>
      </section>

      {/* Analyst price target range */}
      {showAnalystBar && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            Analyst price targets
          </h3>
          <p className="text-xs text-muted mb-6">
            Low, median, mean, high, and current price on one scale.
          </p>
          <AnalystRangeBar
            low={lowTarget}
            high={highTarget}
            mean={meanTarget}
            median={medianTarget}
            current={price}
            currency={currency}
          />
        </section>
      )}

      {/* Enterprise & per-share */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            Enterprise value
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 py-2 border-b border-border/60">
              <dt className="text-muted">Enterprise value</dt>
              <dd className="font-mono font-medium tabular-nums">
                {formatLarge(data.enterpriseValue)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-border/60">
              <dt className="text-muted">EV / Revenue</dt>
              <dd className="font-mono font-medium tabular-nums">
                {fmt(data.enterpriseToRevenue)}×
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-border/60">
              <dt className="text-muted">EV / EBITDA</dt>
              <dd className="font-mono font-medium tabular-nums">
                {fmt(data.enterpriseToEbitda)}×
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">Beta</dt>
              <dd className="font-mono font-medium tabular-nums">
                {fmt(data.beta)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Per share & profitability
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 py-2 border-b border-border/60">
              <dt className="text-muted">EPS (TTM)</dt>
              <dd className="font-mono font-medium tabular-nums">
                {data.trailingEps ? `${currency}${fmt(data.trailingEps)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-border/60">
              <dt className="text-muted">EPS (forward)</dt>
              <dd className="font-mono font-medium tabular-nums">
                {data.forwardEps ? `${currency}${fmt(data.forwardEps)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-border/60">
              <dt className="text-muted">Book value / share</dt>
              <dd className="font-mono font-medium tabular-nums">
                {data.bookValue ? `${currency}${fmt(data.bookValue)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-border/60">
              <dt className="text-muted">FCF / share</dt>
              <dd className="font-mono font-medium tabular-nums">
                {fcfPerShare != null
                  ? `${currency}${fcfPerShare.toFixed(2)}`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted">PEG</dt>
              <dd className="font-mono font-medium tabular-nums">
                {fmt(data.pegRatio)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Margins strip */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Margins</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            ["Gross", data.grossMargins],
            ["EBITDA", data.ebitdaMargins],
            ["Operating", data.operatingMargins],
            ["Net", data.profitMargins],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-lg bg-background border border-border px-3 py-2">
              <p className="text-xs text-muted mb-0.5">{label}</p>
              <p className="font-mono font-semibold tabular-nums">{pct(v as number)}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-sm mt-4">
          <div className="rounded-lg bg-background border border-border px-3 py-2">
            <p className="text-xs text-muted mb-0.5">ROE</p>
            <p className="font-mono font-semibold tabular-nums">
              {pct(data.returnOnEquity)}
            </p>
          </div>
          <div className="rounded-lg bg-background border border-border px-3 py-2">
            <p className="text-xs text-muted mb-0.5">ROA</p>
            <p className="font-mono font-semibold tabular-nums">
              {pct(data.returnOnAssets)}
            </p>
          </div>
        </div>
      </section>

      {/* Analyst consensus detail */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Analyst consensus
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ["Mean target", meanTarget ? `${currency}${meanTarget.toFixed(2)}` : "—"],
            ["Median target", medianTarget ? `${currency}${medianTarget.toFixed(2)}` : "—"],
            ["High", highTarget ? `${currency}${highTarget.toFixed(2)}` : "—"],
            ["Low", lowTarget ? `${currency}${lowTarget.toFixed(2)}` : "—"],
            [
              "Recommendation",
              data.recommendationKey
                ? String(data.recommendationKey).replace(/_/g, " ")
                : "—",
            ],
            [
              "# Analysts",
              data.numberOfAnalystOpinions
                ? String(data.numberOfAnalystOpinions)
                : "—",
            ],
          ].map(([k, v]) => (
            <div
              key={k as string}
              className="flex justify-between gap-4 py-2 px-3 rounded-lg bg-background border border-border/80"
            >
              <span className="text-muted">{k}</span>
              <span className="font-mono font-medium text-right capitalize">
                {v}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-6 text-center">
        <p className="text-sm text-muted mb-2">
          Build a proper DCF, trading comps, or LBO in Financial Models.
        </p>
        <Link
          href={`/models?symbol=${encodeURIComponent(data.symbol)}&tab=DCF`}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          Open Financial Models
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <StockDataCitation tab="valuation" />
    </div>
  );
}

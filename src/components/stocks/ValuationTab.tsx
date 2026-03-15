"use client";

import type { QuoteSummaryData } from "@/lib/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function fmt(val: number, decimals = 2): string {
  return val ? val.toFixed(decimals) : "N/A";
}

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

export default function ValuationTab({ data }: { data: QuoteSummaryData }) {
  const currentPrice = data.regularMarketPrice || 0;

  const metrics = [
    {
      category: "Price Multiples",
      items: [
        { label: "P/E (Trailing)", value: fmt(data.trailingPE) },
        { label: "P/E (Forward)", value: fmt(data.forwardPE) },
        { label: "Price / Book", value: fmt(data.priceToBook) },
        {
          label: "Price / Sales (TTM)",
          value: fmt(data.priceToSalesTrailing12Months),
        },
        { label: "PEG Ratio", value: fmt(data.pegRatio) },
        { label: "Beta", value: fmt(data.beta) },
      ],
    },
    {
      category: "Enterprise Value Multiples",
      items: [
        {
          label: "Enterprise Value",
          value: formatLarge(data.enterpriseValue),
        },
        { label: "EV / Revenue", value: fmt(data.enterpriseToRevenue) },
        { label: "EV / EBITDA", value: fmt(data.enterpriseToEbitda) },
      ],
    },
    {
      category: "Per Share Data",
      items: [
        {
          label: "EPS (Trailing)",
          value: data.trailingEps ? `$${fmt(data.trailingEps)}` : "N/A",
        },
        {
          label: "EPS (Forward)",
          value: data.forwardEps ? `$${fmt(data.forwardEps)}` : "N/A",
        },
        {
          label: "Book Value / Share",
          value: data.bookValue ? `$${fmt(data.bookValue)}` : "N/A",
        },
        {
          label: "Revenue / Share",
          value: data.revenuePerShare
            ? `$${fmt(data.revenuePerShare)}`
            : "N/A",
        },
        {
          label: "Free Cash Flow / Share",
          value:
            data.freeCashflow && data.sharesOutstanding
              ? `$${(data.freeCashflow / data.sharesOutstanding).toFixed(2)}`
              : "N/A",
        },
      ],
    },
    {
      category: "Profitability",
      items: [
        { label: "Gross Margin", value: pct(data.grossMargins) },
        { label: "EBITDA Margin", value: pct(data.ebitdaMargins) },
        { label: "Operating Margin", value: pct(data.operatingMargins) },
        { label: "Profit Margin", value: pct(data.profitMargins) },
        { label: "Return on Equity", value: pct(data.returnOnEquity) },
        { label: "Return on Assets", value: pct(data.returnOnAssets) },
      ],
    },
    {
      category: "Cash Flow & Solvency",
      items: [
        {
          label: "Free Cash Flow",
          value: formatLarge(data.freeCashflow),
        },
        {
          label: "Operating Cash Flow",
          value: formatLarge(data.operatingCashflow),
        },
        { label: "EBITDA", value: formatLarge(data.ebitda) },
        { label: "Total Debt", value: formatLarge(data.totalDebt) },
        { label: "Total Cash", value: formatLarge(data.totalCash) },
        {
          label: "Debt / Equity",
          value: data.debtToEquity ? fmt(data.debtToEquity, 1) : "N/A",
        },
      ],
    },
    {
      category: "Analyst Consensus",
      items: [
        {
          label: "Target (Mean)",
          value: data.targetMeanPrice
            ? `$${fmt(data.targetMeanPrice)}`
            : "N/A",
        },
        {
          label: "Target (Median)",
          value: data.targetMedianPrice
            ? `$${fmt(data.targetMedianPrice)}`
            : "N/A",
        },
        {
          label: "Target (High)",
          value: data.targetHighPrice
            ? `$${fmt(data.targetHighPrice)}`
            : "N/A",
        },
        {
          label: "Target (Low)",
          value: data.targetLowPrice
            ? `$${fmt(data.targetLowPrice)}`
            : "N/A",
        },
        {
          label: "Recommendation",
          value: data.recommendationKey
            ? data.recommendationKey.toUpperCase()
            : "N/A",
        },
        {
          label: "# of Analysts",
          value: data.numberOfAnalystOpinions
            ? String(data.numberOfAnalystOpinions)
            : "N/A",
        },
      ],
    },
  ];

  const meanTarget = data.targetMeanPrice || 0;
  const impliedUpside =
    currentPrice > 0 && meanTarget > 0
      ? ((meanTarget - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="space-y-6">
      {/* Quick summary bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted mb-0.5">Current Price</p>
            <p className="text-lg font-bold font-mono tabular-nums">
              ${currentPrice.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Market Cap</p>
            <p className="text-lg font-bold font-mono tabular-nums">
              {formatLarge(data.marketCap)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Analyst Target (Mean)</p>
            <p className="text-lg font-bold font-mono tabular-nums">
              {meanTarget ? `$${meanTarget.toFixed(2)}` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Implied Upside</p>
            <p
              className={`text-lg font-bold font-mono tabular-nums ${
                impliedUpside !== null
                  ? impliedUpside >= 0
                    ? "text-green-500"
                    : "text-red-500"
                  : ""
              }`}
            >
              {impliedUpside !== null
                ? `${impliedUpside >= 0 ? "+" : ""}${impliedUpside.toFixed(1)}%`
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Metric groups */}
      {metrics.map((group) => (
        <div
          key={group.category}
          className="rounded-xl bg-card border border-border p-5"
        >
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            {group.category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background text-sm"
              >
                <span className="text-muted">{item.label}</span>
                <span className="font-mono font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* CTA to Models */}
      <div className="rounded-xl border border-dashed border-border bg-card-hover/50 p-5 text-center">
        <p className="text-sm text-muted mb-2">
          Need to build a full DCF, comps, or LBO model?
        </p>
        <Link
          href={`/models?symbol=${encodeURIComponent(data.symbol)}&tab=DCF`}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          Open in Financial Models
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

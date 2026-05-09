"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import ExtendedHoursInline from "@/components/ExtendedHoursInline";
import type { EnrichedPosition, EnrichedWatchlistItem } from "@/lib/types";
import { getMetric } from "@/lib/metrics";
import type { MetricDef } from "@/lib/metrics";

const MASK = "••••";

export type NumberScale = "K" | "M" | "B";

function fmtCurrency(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function suffixForScale(scale: NumberScale): string {
  switch (scale) {
    case "K":
      return "K";
    case "M":
      return "M";
    case "B":
      return "B";
    default:
      return "B";
  }
}

function divisorForScale(scale: NumberScale): number {
  switch (scale) {
    case "K":
      return 1e3;
    case "M":
      return 1e6;
    case "B":
      return 1e9;
    default:
      return 1e9;
  }
}

/** Format USD amounts using the selected scale suffix (not auto T/B/M). */
export function formatUsdScaled(value: number, scale: NumberScale): string {
  const d = divisorForScale(scale);
  const v = value / d;
  const suffix = suffixForScale(scale);
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

/** Full dollar amount (no K/M/B); used for market value so it stays readable regardless of scale. */
export function formatUsdFull(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatVolumeScaled(vol: number, scale: NumberScale): string {
  const d = divisorForScale(scale);
  const v = vol / d;
  const suffix = suffixForScale(scale);
  return `${Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

const RIGHT_KEYS = new Set([
  "price",
  "change",
  "changePercent",
  "marketCap",
  "pe",
  "volume",
  "ytdReturn",
  "week52High",
  "week52Low",
  "shares",
  "avgCost",
  "marketValue",
  "totalPL",
  "totalPLPercent",
  "percentPortfolio",
]);

/** Display quote-summary fundamentals in holdings/watchlist cells (and portfolio total row). */
export function formatFundamentalDisplay(
  metricKey: string,
  metric: MetricDef,
  v: number,
  numberScale: NumberScale
): string {
  switch (metric.format) {
    case "currency": {
      const abs = Math.abs(v);
      if (abs >= 1e6) return formatUsdScaled(v, numberScale);
      const neg = v < 0 ? "-" : "";
      return `${neg}$${abs.toLocaleString(undefined, {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      })}`;
    }
    case "percent":
      return `${(v * 100).toFixed(2)}%`;
    case "ratio":
      return metricKey === "epsdiluted" ? `$${v.toFixed(2)}` : v.toFixed(2);
    case "number":
      return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    default:
      return String(v);
  }
}

export function metricCellThClass(metricKey: string): string {
  const base = "px-4 py-3";
  if (RIGHT_KEYS.has(metricKey) || getMetric(metricKey))
    return `${base} text-right`;
  return base;
}

type RowPack =
  | { mode: "holdings"; row: EnrichedPosition; valuesVisible: boolean }
  | { mode: "watchlist"; row: EnrichedWatchlistItem };

export interface MetricCellOpts {
  stocksHref: string;
  attachChevron: boolean;
  isExpanded: boolean;
  /** Holdings/table large-number formatting; watchlist ignores where unused */
  numberScale?: NumberScale;
  /** Holdings table total value, used for % of portfolio. */
  totalPortfolioValue?: number;
}

function ClearbitOrLetterAvatar({ symbol }: { symbol: string }) {
  const letter = (symbol.trim().charAt(0) || "?").toUpperCase();
  const slug = symbol.split(/[.-]/)[0]?.trim().toLowerCase() ?? "";
  const domainGuess = slug && /^[a-z]+$/.test(slug) ? `${slug}.com` : "";
  const logoUrl = domainGuess
    ? `https://logo.clearbit.com/${domainGuess}`
    : "";

  const [imgOk, setImgOk] = useState(Boolean(logoUrl));

  if (!logoUrl || !imgOk) {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-card border border-border text-[10px] font-semibold text-muted"
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-sm border border-border bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- external Clearbit logo */}
      <img
        src={logoUrl}
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 object-cover"
        onError={() => setImgOk(false)}
      />
    </span>
  );
}

export function renderPortfolioWatchlistMetricCell(
  metricKey: string,
  pack: RowPack,
  opts: MetricCellOpts
): ReactNode {
  const {
    stocksHref,
    attachChevron,
    isExpanded,
    numberScale = "B",
    totalPortfolioValue = 0,
  } = opts;
  const row = pack.row;
  const isHoldings = pack.mode === "holdings";

  switch (metricKey) {
    case "ticker":
      if (isHoldings) {
        const hp = pack.row;
        return (
          <td className={`${metricCellThClass(metricKey)} min-w-0`}>
            <div className="flex items-center gap-2 min-w-0">
              <ClearbitOrLetterAvatar symbol={hp.symbol} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Link
                    href={stocksHref}
                    onClick={(e) => e.stopPropagation()}
                    className="block min-w-0 truncate font-medium text-[13px] text-foreground hover:text-accent hover:underline"
                  >
                    {hp.name}
                  </Link>
                  {attachChevron ? (
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="truncate text-[10px] text-muted">
                  —:{hp.symbol}
                </div>
              </div>
            </div>
          </td>
        );
      }
      return (
        <td className={`${metricCellThClass(metricKey)} min-w-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={stocksHref}
              onClick={(e) => e.stopPropagation()}
              className="block shrink-0 truncate font-semibold text-accent hover:underline"
            >
              {row.symbol}
            </Link>
            {attachChevron ? (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            ) : null}
          </div>
        </td>
      );
    case "name":
      return (
        <td className={`${metricCellThClass(metricKey)} min-w-0 max-w-[12rem]`}>
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={stocksHref}
              onClick={(e) => e.stopPropagation()}
              className="block min-w-0 truncate text-sm text-muted hover:text-accent hover:underline"
            >
              {row.name}
            </Link>
            {attachChevron ? (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            ) : null}
          </div>
        </td>
      );
    case "sector":
      return (
        <td
          className={`${metricCellThClass(metricKey)} max-w-[10rem] truncate text-sm text-muted`}
          title={(row.sector || "").trim() || undefined}
        >
          {(row.sector || "").trim() ? row.sector : "—"}
        </td>
      );
    case "price":
      return (
        <td className="px-4 py-3 text-right font-mono align-top">
          <div>${fmtCurrency(row.currentPrice)}</div>
          {row.extendedHours ? (
            <ExtendedHoursInline
              line={row.extendedHours}
              compact
              className="mt-0.5 justify-end"
            />
          ) : null}
        </td>
      );
    case "change":
      return (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {row.dayChange >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-green" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red" />
            )}
            <span
              className={`font-mono ${
                row.dayChange >= 0 ? "text-green" : "text-red"
              }`}
            >
              {row.dayChange >= 0 ? "+" : ""}
              {row.dayChange.toFixed(2)}
            </span>
          </div>
        </td>
      );
    case "changePercent":
      return (
        <td className="px-4 py-3 text-right">
          <span
            className={`font-mono ${
              row.dayChangePercent >= 0 ? "text-green" : "text-red"
            }`}
          >
            {row.dayChangePercent >= 0 ? "+" : ""}
            {row.dayChangePercent.toFixed(2)}%
          </span>
        </td>
      );
    case "marketCap":
      return (
        <td className="px-4 py-3 text-right font-mono">
          {(row.marketCap ?? 0) > 0
            ? formatUsdScaled(row.marketCap!, numberScale)
            : "—"}
        </td>
      );
    case "pe":
      return (
        <td className="px-4 py-3 text-right font-mono">
          {row.pe != null && row.pe > 0 ? row.pe.toFixed(2) : "—"}
        </td>
      );
    case "volume":
      return (
        <td className="px-4 py-3 text-right font-mono text-muted">
          {(row.volume ?? 0) > 0
            ? formatVolumeScaled(row.volume!, numberScale)
            : "—"}
        </td>
      );
    case "ytdReturn":
      return (
        <td className="px-4 py-3 text-right font-mono">
          {row.ytdReturn != null && Number.isFinite(row.ytdReturn) ? (
            <span
              className={row.ytdReturn >= 0 ? "text-green" : "text-red"}
            >{`${row.ytdReturn >= 0 ? "+" : ""}${row.ytdReturn.toFixed(2)}%`}</span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
      );
    case "week52High":
      return (
        <td className="px-4 py-3 text-right font-mono">
          ${fmtCurrency(row.fiftyTwoWeekHigh ?? 0)}
        </td>
      );
    case "week52Low":
      return (
        <td className="px-4 py-3 text-right font-mono">
          ${fmtCurrency(row.fiftyTwoWeekLow ?? 0)}
        </td>
      );
    case "shares":
      return (
        <td className="px-4 py-3 text-right font-mono">
          {isHoldings ? pack.row.shares : "—"}
        </td>
      );
    case "avgCost":
      return (
        <td className="px-4 py-3 text-right font-mono">
          {isHoldings ? `$${fmtCurrency(pack.row.avgCost)}` : "—"}
        </td>
      );
    case "marketValue":
      return (
        <td className="px-4 py-3 text-right font-mono">
          {isHoldings
            ? pack.valuesVisible
              ? formatUsdFull(pack.row.marketValue)
              : MASK
            : "—"}
        </td>
      );
    case "totalPLPercent":
      return (
        <td className="px-4 py-3 text-right font-mono">
          {isHoldings ? (
            <span
              className={pack.row.totalPLPercent >= 0 ? "text-green" : "text-red"}
            >
              {`${pack.row.totalPLPercent >= 0 ? "+" : ""}${pack.row.totalPLPercent.toFixed(2)}%`}
            </span>
          ) : (
            "—"
          )}
        </td>
      );
    case "percentPortfolio": {
      const pct =
        isHoldings && totalPortfolioValue > 0
          ? (pack.row.marketValue / totalPortfolioValue) * 100
          : null;
      return (
        <td className="px-4 py-3 text-right font-mono">
          {pct != null ? `${pct.toFixed(2)}%` : "—"}
        </td>
      );
    }
    case "totalPL":
      return (
        <td className="px-4 py-3 text-right">
          {isHoldings ? (
            <>
              <div
                className={`font-mono font-medium ${
                  pack.row.totalPL >= 0 ? "text-green" : "text-red"
                }`}
              >
                {`${pack.row.totalPL >= 0 ? "+" : ""}$${fmtCurrency(
                  Math.abs(pack.row.totalPL)
                )}`}
              </div>
              <div
                className={`font-mono text-xs ${
                  pack.row.totalPLPercent >= 0 ? "text-green" : "text-red"
                }`}
              >
                {`${pack.row.totalPLPercent >= 0 ? "+" : ""}${pack.row.totalPLPercent.toFixed(2)}%`}
              </div>
            </>
          ) : (
            "—"
          )}
        </td>
      );
    default: {
      const metric = getMetric(metricKey);
      const fund = pack.row.fundamentals;
      const v = fund?.[metricKey];
      if (metric && v != null && Number.isFinite(v)) {
        return (
          <td
            className={`${metricCellThClass(metricKey)} font-mono text-[13px]`}
          >
            {formatFundamentalDisplay(metricKey, metric, v, numberScale)}
          </td>
        );
      }
      return (
        <td className={metricCellThClass(metricKey)}>
          <span className="text-muted">—</span>
        </td>
      );
    }
  }
}

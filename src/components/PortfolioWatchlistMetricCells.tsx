"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import ExtendedHoursInline from "@/components/ExtendedHoursInline";
import type { EnrichedPosition, EnrichedWatchlistItem } from "@/lib/types";

const MASK = "••••";

function fmtCurrency(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${fmtCurrency(value)}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
  return vol.toLocaleString();
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
]);

export function metricCellThClass(metricKey: string): string {
  const base = "px-4 py-3";
  if (RIGHT_KEYS.has(metricKey)) return `${base} text-right`;
  return base;
}

type RowPack =
  | { mode: "holdings"; row: EnrichedPosition; valuesVisible: boolean }
  | { mode: "watchlist"; row: EnrichedWatchlistItem };

export interface MetricCellOpts {
  stocksHref: string;
  attachChevron: boolean;
  isExpanded: boolean;
}

export function renderPortfolioWatchlistMetricCell(
  metricKey: string,
  pack: RowPack,
  opts: MetricCellOpts
): ReactNode {
  const { stocksHref, attachChevron, isExpanded } = opts;
  const row = pack.row;
  const isHoldings = pack.mode === "holdings";

  switch (metricKey) {
    case "ticker":
      return (
        <td className={`${metricCellThClass(metricKey)} min-w-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={stocksHref}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-accent hover:underline block truncate shrink-0"
            >
              {row.symbol}
            </Link>
            {attachChevron ? (
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform shrink-0 ${
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
              className="text-sm text-muted hover:text-accent hover:underline block truncate min-w-0"
            >
              {row.name}
            </Link>
            {attachChevron ? (
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform shrink-0 ${
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
          className={`${metricCellThClass(metricKey)} text-sm text-muted max-w-[10rem] truncate`}
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
          {(row.marketCap ?? 0) > 0 ? formatMarketCap(row.marketCap!) : "—"}
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
          {(row.volume ?? 0) > 0 ? formatVolume(row.volume!) : "—"}
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
              ? `$${fmtCurrency(pack.row.marketValue)}`
              : MASK
            : "—"}
        </td>
      );
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
                className={`text-xs font-mono ${
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
    default:
      return (
        <td className={metricCellThClass(metricKey)}>
          <span className="text-muted">—</span>
        </td>
      );
  }
}

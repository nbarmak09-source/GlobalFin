"use client";

import { useEffect, useState } from "react";
import type { TickerItem } from "@/lib/types";

const INDEX_SYMBOLS = ["^GSPC", "^DJI", "^IXIC", "^VIX", "^GSPTSE"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  JPY: "¥",
  GBP: "£",
  CNY: "CN¥",
  CAD: "C$",
};

/** Compact index levels for narrow columns; change % stays full precision on its own line. */
function fmtAbbrevIndexPrice(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
  if (value >= 1000) {
    return `${sym}${(value / 1000).toFixed(1)}k`;
  }
  return `${sym}${value.toFixed(2)}`;
}

export default function MarketOverview() {
  const [indices, setIndices] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIndices() {
      try {
        const res = await fetch("/api/stocks?action=ticker", {
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/";
          return;
        }
        if (res.ok) {
          const data: TickerItem[] = await res.json();
          setIndices(data.filter((d) => INDEX_SYMBOLS.includes(d.symbol)));
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchIndices();
  }, []);

  if (loading) {
    return (
      <div
        className="flex overflow-x-auto border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="shrink-0 px-5 py-3 h-[76px] animate-pulse bg-card-hover/20"
            style={{
              minWidth: 160,
              borderRight: i < 5 ? "1px solid var(--border)" : undefined,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex overflow-x-auto"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {indices.map((index, i) => {
        const isPositive = index.change >= 0;
        return (
          <div
            key={index.symbol}
            className="flex flex-col gap-0.5 shrink-0 px-5 py-3"
            style={{
              minWidth: 160,
              borderRight:
                i < indices.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {index.name}
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
              }}
            >
              {fmtAbbrevIndexPrice(index.priceUSD, "USD")}
            </span>
            <span
              className="whitespace-nowrap tabular-nums shrink-0"
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                color: isPositive ? "var(--green)" : "var(--red)",
              }}
            >
              {isPositive ? "+" : ""}
              {index.changePercent.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

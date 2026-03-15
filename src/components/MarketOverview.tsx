"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { TickerItem } from "@/lib/types";

const INDEX_SYMBOLS = ["^GSPC", "000001.SS", "^N225", "^FTSE", "^GSPTSE"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  JPY: "¥",
  GBP: "£",
  CNY: "CN¥",
  CAD: "C$",
};

function fmtCurrency(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency + " ";
  return `${sym}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-card border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {indices.map((index) => {
        const isPositive = index.change >= 0;
        const isUSD = index.currency === "USD";
        return (
          <div
            key={index.symbol}
            className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted">
                {index.name}
              </span>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red" />
              )}
            </div>
            <div className="text-xl font-bold font-mono">
              {fmtCurrency(index.price, index.currency)}
            </div>
            <div
              className={`text-sm font-mono mt-1 ${
                isPositive ? "text-green" : "text-red"
              }`}
            >
              {isPositive ? "+" : ""}
              {index.changePercent.toFixed(2)}%
            </div>
            {!isUSD && (
              <div className="text-xs font-mono text-muted mt-1">
                ${index.priceUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USD
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

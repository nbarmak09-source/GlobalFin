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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {indices.map((index) => {
        const isPositive = index.change >= 0;
        const isUSD = index.currency === "USD";
        return (
          <div
            key={index.symbol}
            className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover transition-all duration-200 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-[400] text-muted leading-tight">
                {index.name}
              </span>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red shrink-0" />
              )}
            </div>
            <div className="text-[30px] font-[500] font-mono leading-none">
              {fmtCurrency(index.priceUSD, "USD")}
            </div>
            <div
              className={`text-[13px] font-[400] font-mono mt-2 ${
                isPositive ? "text-green" : "text-red"
              }`}
            >
              {isPositive ? "+" : ""}
              {index.changePercent.toFixed(2)}%
            </div>
            {!isUSD && (
              <div className="text-[11px] font-[400] font-mono text-muted mt-1" style={{ opacity: 0.7 }}>
                {fmtCurrency(index.price, index.currency)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

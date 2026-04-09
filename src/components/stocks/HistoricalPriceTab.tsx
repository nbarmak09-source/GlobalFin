"use client";

import { useState, useEffect } from "react";
import TradingViewChart from "@/components/TradingViewChart";
import type { StockQuote } from "@/lib/types";
import { BarChart3, DollarSign, Activity } from "lucide-react";

const PERIODS = [
  { label: "1D", interval: "5" },
  { label: "5D", interval: "60" },
  { label: "1M", interval: "D" },
  { label: "3M", interval: "D" },
  { label: "6M", interval: "D" },
  { label: "YTD", interval: "D" },
  { label: "1Y", interval: "D" },
  { label: "5Y", interval: "W" },
];

function formatNumber(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
}

export default function HistoricalPriceTab({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[6]); // 1Y
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [chartHeight, setChartHeight] = useState(() =>
    typeof window !== "undefined" ? Math.max(700, window.innerHeight - 240) : 800
  );

  useEffect(() => {
    function handleResize() {
      setChartHeight(Math.max(700, window.innerHeight - 240));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch(
          `/api/stocks?action=quote&symbol=${encodeURIComponent(symbol)}`
        );
        if (res.ok) setQuote(await res.json());
      } catch {
        // silently fail
      }
    }
    fetchQuote();
  }, [symbol]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              p.label === period.label
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-w-0">
        <div className="lg:col-span-3">
          <TradingViewChart
            symbol={symbol}
            height={chartHeight}
            interval={period.interval}
            yahooExchange={quote?.exchange}
            yahooExchangeName={quote?.exchangeName}
          />
        </div>

        {quote && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Key Statistics
            </h3>
            <div className="space-y-2">
              {[
                { label: "Open", value: `$${quote.regularMarketOpen.toFixed(2)}` },
                { label: "High", value: `$${quote.regularMarketDayHigh.toFixed(2)}` },
                { label: "Low", value: `$${quote.regularMarketDayLow.toFixed(2)}` },
                { label: "Prev Close", value: `$${quote.regularMarketPreviousClose.toFixed(2)}` },
                { label: "Volume", value: formatNumber(quote.regularMarketVolume), icon: Activity },
                { label: "Market Cap", value: `$${formatNumber(quote.marketCap)}`, icon: DollarSign },
                { label: "P/E Ratio", value: quote.trailingPE ? quote.trailingPE.toFixed(2) : "N/A" },
                { label: "52W High", value: `$${quote.fiftyTwoWeekHigh.toFixed(2)}` },
                { label: "52W Low", value: `$${quote.fiftyTwoWeekLow.toFixed(2)}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-card border border-border text-sm"
                >
                  <span className="text-muted">{stat.label}</span>
                  <span className="font-mono font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

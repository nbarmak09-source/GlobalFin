"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CurrencyQuote {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export default function CurrenciesPanel() {
  const [currencies, setCurrencies] = useState<CurrencyQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCurrencies() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/currencies", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to load");
        }
        const data: CurrencyQuote[] = await res.json();
        setCurrencies(data);
      } catch {
        setError("Data temporarily unavailable");
      } finally {
        setLoading(false);
      }
    }
    fetchCurrencies();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-card border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 text-center text-muted text-sm">
        {error}
      </div>
    );
  }

  if (currencies.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 text-center text-muted text-sm">
        No currency data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {currencies.map((q) => {
        const isPositive = q.change >= 0;
        return (
          <div
            key={q.pair}
            className="rounded-xl bg-card border border-border p-4 hover:bg-card-hover transition-all duration-200 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-[400] text-muted">{q.pair}</span>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red" />
              )}
            </div>
            <div className="text-[28px] font-[500] font-mono leading-none">
              {q.price.toLocaleString(undefined, {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })}
            </div>
            <div
              className={`text-[13px] font-[400] font-mono mt-2 ${
                isPositive ? "text-green" : "text-red"
              }`}
            >
              {isPositive ? "+" : ""}
              {q.changePercent.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}


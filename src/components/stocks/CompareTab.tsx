"use client";

import { useState } from "react";
import { Plus, X, Loader2, Search } from "lucide-react";
import type { StockQuote, SearchResult } from "@/lib/types";

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

interface CompareTabProps {
  currentSymbol: string;
}

export default function CompareTab({ currentSymbol }: CompareTabProps) {
  const [symbols, setSymbols] = useState<string[]>([currentSymbol]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function fetchQuote(sym: string) {
    if (quotes[sym]) return;
    setLoading((prev) => ({ ...prev, [sym]: true }));
    try {
      const res = await fetch(
        `/api/stocks?action=quote&symbol=${encodeURIComponent(sym)}`
      );
      if (res.ok) {
        const data = await res.json();
        setQuotes((prev) => ({ ...prev, [sym]: data }));
      }
    } catch {
      // silently fail
    } finally {
      setLoading((prev) => ({ ...prev, [sym]: false }));
    }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/stocks?action=search&q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  }

  function addSymbol(sym: string) {
    if (!symbols.includes(sym)) {
      setSymbols((prev) => [...prev, sym]);
      fetchQuote(sym);
    }
    setSearchQuery("");
    setSearchResults([]);
  }

  function removeSymbol(sym: string) {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  }

  // Fetch quotes on mount for symbols that haven't been fetched
  useState(() => {
    symbols.forEach((sym) => fetchQuote(sym));
  });

  const metrics: { label: string; getValue: (q: StockQuote) => string }[] = [
    { label: "Price", getValue: (q) => `$${fmt(q.regularMarketPrice)}` },
    { label: "Change", getValue: (q) => `${q.regularMarketChange >= 0 ? "+" : ""}${fmt(q.regularMarketChange)}` },
    { label: "Change %", getValue: (q) => `${q.regularMarketChangePercent >= 0 ? "+" : ""}${fmt(q.regularMarketChangePercent)}%` },
    { label: "Market Cap", getValue: (q) => formatLarge(q.marketCap) },
    { label: "P/E Ratio", getValue: (q) => fmt(q.trailingPE) },
    { label: "Volume", getValue: (q) => q.regularMarketVolume?.toLocaleString() || "N/A" },
    { label: "52W High", getValue: (q) => `$${fmt(q.fiftyTwoWeekHigh)}` },
    { label: "52W Low", getValue: (q) => `$${fmt(q.fiftyTwoWeekLow)}` },
    { label: "Open", getValue: (q) => `$${fmt(q.regularMarketOpen)}` },
    { label: "Prev Close", getValue: (q) => `$${fmt(q.regularMarketPreviousClose)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Add symbol to compare..."
          className="w-full rounded-lg bg-card border border-border pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted animate-spin" />
        )}

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl max-h-48 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                onClick={() => addSymbol(r.symbol)}
                className="w-full text-left px-3 py-2 hover:bg-card-hover transition-colors border-b border-border/50 last:border-0 flex items-center gap-2"
              >
                <Plus className="h-3 w-3 text-accent" />
                <span className="text-sm font-semibold text-accent">
                  {r.symbol}
                </span>
                <span className="text-xs text-muted">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {symbols.map((sym) => (
          <span
            key={sym}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium"
          >
            {sym}
            {symbols.length > 1 && (
              <button
                onClick={() => removeSymbol(sym)}
                className="hover:text-red transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {symbols.length > 0 && (
        <div className="rounded-xl bg-card border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider sticky left-0 bg-card">
                  Metric
                </th>
                {symbols.map((sym) => (
                  <th
                    key={sym}
                    className="text-right py-3 px-4 text-sm font-semibold text-accent"
                  >
                    {sym}
                    {loading[sym] && (
                      <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr
                  key={metric.label}
                  className="border-b border-border/50 hover:bg-card-hover"
                >
                  <td className="py-2.5 px-4 text-muted font-medium sticky left-0 bg-card">
                    {metric.label}
                  </td>
                  {symbols.map((sym) => {
                    const q = quotes[sym];
                    return (
                      <td
                        key={sym}
                        className="py-2.5 px-4 text-right font-mono"
                      >
                        {q ? metric.getValue(q) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import type { SearchResult } from "@/lib/types";

interface AddPositionModalProps {
  onClose: () => void;
  onAdd: (position: {
    symbol: string;
    name: string;
    shares: number;
    avgCost: number;
    purchaseDate?: string;
  }) => void;
}

export default function AddPositionModal({
  onClose,
  onAdd,
}: AddPositionModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 1) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `/api/stocks?action=search&q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !shares || !avgCost) return;

    setSubmitting(true);
    try {
      await onAdd({
        symbol: selected.symbol,
        name: selected.name,
        shares: parseFloat(shares),
        avgCost: parseFloat(avgCost),
        purchaseDate: purchaseDate || undefined,
      });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Add Position</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-card-hover transition-colors"
          >
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!selected ? (
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Search Symbol
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for a stock..."
                  className="w-full rounded-lg bg-background border border-border pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted animate-spin" />
                )}
              </div>
              {results.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-background">
                  {results.map((r) => (
                    <button
                      key={r.symbol}
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-card-hover transition-colors border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm font-semibold text-accent">
                        {r.symbol}
                      </span>
                      <span className="text-xs text-muted ml-2">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border">
              <div>
                <span className="text-sm font-semibold text-accent">
                  {selected.symbol}
                </span>
                <span className="text-xs text-muted ml-2">
                  {selected.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className="text-xs text-muted hover:text-foreground"
              >
                Change
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Number of Shares
            </label>
            <input
              type="number"
              step="any"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="e.g., 10"
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Average Cost per Share
            </label>
            <input
              type="number"
              step="any"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              placeholder="e.g., 150.00"
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={!selected || !shares || !avgCost || submitting}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Adding..." : "Add Position"}
          </button>
        </form>
      </div>
    </div>
  );
}

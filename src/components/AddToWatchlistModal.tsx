"use client";

import { useState, useRef, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import type { SearchResult } from "@/lib/types";

interface AddToWatchlistModalProps {
  onClose: () => void;
  onAdd: (item: { symbol: string; name: string }) => void;
}

export default function AddToWatchlistModal({
  onClose,
  onAdd,
}: AddToWatchlistModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 1) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
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
    }, 300);
  }

  async function handleSelect(result: SearchResult) {
    setSubmitting(true);
    try {
      await onAdd({ symbol: result.symbol, name: result.name });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 mx-4 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Add to Watchlist</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-card-hover transition-colors duration-200 cursor-pointer"
          >
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1">
            Search Symbol
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search for a stock..."
              className="w-full rounded-lg bg-background border border-border pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition-colors duration-200"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted animate-spin" />
            )}
          </div>
          {results.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background">
              {results.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2.5 hover:bg-card-hover transition-colors duration-200 border-b border-border/50 last:border-0 disabled:opacity-40 cursor-pointer"
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
      </div>
    </div>
  );
}

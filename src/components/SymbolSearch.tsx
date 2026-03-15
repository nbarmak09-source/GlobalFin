"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import type { SearchResult } from "@/lib/types";

interface SymbolSearchProps {
  onSelect: (symbol: string, name: string) => void;
  initialSymbol?: string;
  placeholder?: string;
}

export default function SymbolSearch({
  onSelect,
  initialSymbol = "",
  placeholder = "Search symbol (e.g., AAPL, MSFT)...",
}: SymbolSearchProps) {
  const [query, setQuery] = useState(initialSymbol);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setQuery(initialSymbol);
  }, [initialSymbol]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/stocks?action=search&q=${encodeURIComponent(value)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setShowDropdown(true);
        }
      } catch {
        // silently fail
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleSelect(result: SearchResult) {
    setQuery(result.symbol);
    setShowDropdown(false);
    setResults([]);
    onSelect(result.symbol, result.name);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      const sym = query.trim().toUpperCase();
      const exactMatch = results.find((r) => r.symbol.toUpperCase() === sym);
      if (exactMatch) {
        handleSelect(exactMatch);
      } else {
        setShowDropdown(false);
        setResults([]);
        onSelect(sym, sym);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-card border border-border pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted animate-spin" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-card-hover transition-colors border-b border-border/50 last:border-0 flex items-center justify-between"
            >
              <div>
                <span className="text-sm font-semibold text-accent">
                  {r.symbol}
                </span>
                <span className="text-xs text-muted ml-2">{r.name}</span>
              </div>
              <span className="text-xs text-muted">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

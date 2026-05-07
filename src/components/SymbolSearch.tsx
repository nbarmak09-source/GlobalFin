"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import type { SearchResult } from "@/lib/types";

interface SymbolSearchProps {
  onSelect: (symbol: string, name: string) => void;
  /** Called when the user clears the field and presses Enter (e.g. exit stock detail on Stocks). */
  onClear?: () => void;
  initialSymbol?: string;
  placeholder?: string;
  /** Compact styling for the fixed header search (TopBar). */
  variant?: "default" | "topbar";
}

export default function SymbolSearch({
  onSelect,
  onClear,
  initialSymbol = "",
  placeholder = "Search symbol (e.g., AAPL, MSFT)...",
  variant = "default",
}: SymbolSearchProps) {
  const isTopbar = variant === "topbar";
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
    if (e.key !== "Enter") return;
    if (!query.trim()) {
      if (onClear) {
        e.preventDefault();
        onClear();
      }
      return;
    }
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

  return (
    <div
      ref={containerRef}
      className={isTopbar ? "relative w-full" : "relative w-full max-w-md"}
    >
      <div className="relative">
        {isTopbar ? (
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" />
            <line x1="14" y1="14" x2="18" y2="18" />
          </svg>
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        )}
        <input
          type="search"
          enterKeyHint="search"
          aria-label={isTopbar ? "Search stocks and tickers" : undefined}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={
            isTopbar
              ? "w-full pl-9 pr-9 outline-none transition-colors placeholder:text-[var(--text-muted)]"
              : "w-full rounded-lg bg-card border border-border pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          }
          style={
            isTopbar
              ? {
                  height: 36,
                  borderRadius: 999,
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                }
              : undefined
          }
        />
        {searching && (
          <Loader2
            className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin ${
              isTopbar ? "" : "text-muted"
            }`}
            style={isTopbar ? { color: "var(--text-muted)" } : undefined}
          />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div
          className={
            isTopbar
              ? "absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto"
              : "absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl max-h-64 overflow-y-auto"
          }
          style={
            isTopbar
              ? {
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-strong)",
                  boxShadow: "var(--shadow-md)",
                }
              : undefined
          }
        >
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              onClick={() => handleSelect(r)}
              className={
                isTopbar
                  ? "w-full text-left px-3 py-2.5 transition-colors border-b border-border last:border-0 flex items-center justify-between hover:bg-bg-hover"
                  : "w-full text-left px-3 py-2.5 hover:bg-card-hover transition-colors border-b border-border/50 last:border-0 flex items-center justify-between"
              }
            >
              <div>
                <span
                  className={`text-sm font-semibold ${isTopbar ? "" : "text-accent"}`}
                  style={isTopbar ? { color: "var(--accent)" } : undefined}
                >
                  {r.symbol}
                </span>
                <span
                  className={`text-xs ml-2 ${isTopbar ? "" : "text-muted"}`}
                  style={
                    isTopbar ? { color: "var(--text-secondary)" } : undefined
                  }
                >
                  {r.name}
                </span>
              </div>
              <span
                className={`text-xs ${isTopbar ? "" : "text-muted"}`}
                style={isTopbar ? { color: "var(--text-muted)" } : undefined}
              >
                {r.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

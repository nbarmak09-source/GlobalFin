"use client";

import type { RecentStockEntry } from "@/lib/recentStocks";

interface RecentStocksRowProps {
  entries: RecentStockEntry[];
  onSelect: (symbol: string, name: string) => void;
}

export default function RecentStocksRow({ entries, onSelect }: RecentStocksRowProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Recent</span>
      <div className="flex flex-wrap gap-2">
        {entries.map((e) => (
          <button
            key={e.symbol}
            type="button"
            onClick={() => onSelect(e.symbol, e.name)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-left hover:bg-card-hover hover:border-accent/40 transition-colors cursor-pointer max-w-full"
          >
            <span className="font-mono font-semibold text-accent shrink-0">[{e.symbol}]</span>
            <span className="text-muted truncate">{e.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

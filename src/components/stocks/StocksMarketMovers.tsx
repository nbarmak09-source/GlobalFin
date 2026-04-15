"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Gem,
} from "lucide-react";
import type { MarketMoverQuote, MarketMoversBoard } from "@/lib/types";

const MAX_ROWS = 8;

function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

function fmtPrice(v: number): string {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pctClass(p: number): string {
  if (p > 0) return "text-green";
  if (p < 0) return "text-red";
  return "text-muted";
}

function formatPeLine(row: MarketMoverQuote): string | null {
  const pe = row.trailingPE ?? row.forwardPE;
  if (pe == null || !Number.isFinite(pe) || pe <= 0) return null;
  return `P/E ${pe.toFixed(1)}`;
}

interface StocksMarketMoversProps {
  onSelectSymbol: (symbol: string, name: string) => void;
}

type PanelKey = keyof MarketMoversBoard;

const PANELS: {
  key: PanelKey;
  preset: string;
  title: string;
  subtitle: string;
  icon: typeof TrendingUp;
  accent: string;
  showPe?: boolean;
}[] = [
  {
    key: "gainers",
    preset: "gainers",
    title: "Day gainers",
    subtitle: "Largest % advances",
    icon: TrendingUp,
    accent: "text-green",
  },
  {
    key: "losers",
    preset: "losers",
    title: "Day losers",
    subtitle: "Largest % declines",
    icon: TrendingDown,
    accent: "text-red",
  },
  {
    key: "mostActive",
    preset: "most-active",
    title: "Most active",
    subtitle: "Highest share volume",
    icon: BarChart3,
    accent: "text-accent",
  },
  {
    key: "undervaluedLargeCaps",
    preset: "undervalued",
    title: "Undervalued large caps",
    subtitle: "Yahoo value screen",
    icon: Gem,
    accent: "text-accent",
    showPe: true,
  },
];

function MoverRow({
  row,
  showPe,
  onSelect,
}: {
  row: MarketMoverQuote;
  showPe?: boolean;
  onSelect: () => void;
}) {
  const isPositive = row.regularMarketChangePercent >= 0;
  const volLine =
    row.regularMarketVolume > 0 ? `Vol ${fmtVolume(row.regularMarketVolume)}` : null;
  const peLine = showPe ? formatPeLine(row) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg text-left hover:bg-card-hover transition-colors duration-150 cursor-pointer border border-transparent hover:border-border"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-semibold text-sm text-foreground shrink-0">
            {row.symbol}
          </span>
          <span className="text-xs text-muted truncate">{row.shortName}</span>
        </div>
        {peLine ? (
          <div className="text-[11px] font-mono text-muted/80 mt-0.5">{peLine}</div>
        ) : null}
        {volLine ? (
          <div className="text-[11px] font-mono text-muted mt-0.5">{volLine}</div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-mono font-medium tabular-nums">
          ${fmtPrice(row.regularMarketPrice)}
        </div>
        <div
          className={`text-xs font-mono tabular-nums ${pctClass(row.regularMarketChangePercent)}`}
        >
          {isPositive ? "+" : ""}
          {row.regularMarketChangePercent.toFixed(2)}%
        </div>
      </div>
    </button>
  );
}

export default function StocksMarketMovers({ onSelectSymbol }: StocksMarketMoversProps) {
  const [data, setData] = useState<MarketMoversBoard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks?action=marketMovers&count=${MAX_ROWS}`);
        if (!res.ok) return;
        const json: MarketMoversBoard = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3"
          >
            <div className="h-4 w-32 rounded bg-border" />
            <div className="h-3 w-48 rounded bg-border" />
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="h-10 rounded-lg bg-border/80" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const isEmpty =
    !data ||
    PANELS.every((p) => (data[p.key]?.length ?? 0) === 0);

  if (isEmpty) {
    return (
      <section className="rounded-xl border border-border bg-card/60 p-4 text-sm text-muted">
        <p className="text-foreground font-medium mb-1">Market movers unavailable</p>
        <p className="text-xs leading-relaxed mb-3">
          Day gainers, losers, and most active lists load from Yahoo Finance. If they are empty, try again in a
          moment or open the screener. Your <span className="text-muted">Recent</span> list is stored locally and
          always shows here.
        </p>
        <Link
          href="/screener?preset=gainers"
          className="text-xs font-medium text-accent hover:underline"
        >
          Open screener →
        </Link>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {PANELS.map((panel) => {
        const rows = (data![panel.key] ?? []).slice(0, MAX_ROWS);
        const Icon = panel.icon;
        if (rows.length === 0) return null;
        return (
          <section
            key={panel.key}
            className="rounded-xl border border-border bg-card flex flex-col min-h-0 shadow-sm"
          >
            <div className="px-4 pt-4 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${panel.accent}`} aria-hidden />
                <h2 className="text-sm font-semibold leading-tight">{panel.title}</h2>
              </div>
              <p className="text-[11px] text-muted mt-0.5 pl-6">{panel.subtitle}</p>
            </div>
            <div className="px-2 py-2 flex-1 min-h-0">
              {rows.map((row) => (
                <MoverRow
                  key={row.symbol}
                  row={row}
                  showPe={panel.showPe}
                  onSelect={() => onSelectSymbol(row.symbol, row.shortName)}
                />
              ))}
            </div>
            <div className="px-4 pb-3 pt-1 border-t border-border mt-auto">
              <Link
                href={`/screener?preset=${encodeURIComponent(panel.preset)}`}
                className="text-xs font-medium text-accent hover:underline"
              >
                Show more →
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}

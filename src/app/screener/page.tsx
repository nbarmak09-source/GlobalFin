"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Filter,
  Search,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
} from "lucide-react";

interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  dayChangePct: number;
  pe: number;
  forwardPE: number;
  dividendYield: number;
  beta: number;
  revenueGrowth: number;
  profitMargins: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

type SortKey = keyof ScreenerResult;

const SECTORS = [
  "",
  "Technology",
  "Healthcare",
  "Financials",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Communication Services",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Basic Materials",
];

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function fmtPct(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

function fmtNum(n: number, dec = 2) {
  if (!n || !isFinite(n)) return "—";
  return n.toFixed(dec);
}

const PRESETS: Record<string, Record<string, string>> = {
  undervalued: { maxPE: "15" },
  "growth-tech": { sector: "Technology", minRevenueGrowth: "10" },
  dividends: { minDividendYield: "3" },
  "balance-sheet": { maxDebtToEquity: "80", minCurrentRatio: "1.5" },
  "mega-cap": { minMarketCap: "200000000000" },
  defensive: { maxBeta: "0.8" },
};

function ScreenerContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  const [sector, setSector] = useState("");
  const [minPE, setMinPE] = useState("");
  const [maxPE, setMaxPE] = useState("");
  const [minDividendYield, setMinDividendYield] = useState("");
  const [maxDividendYield, setMaxDividendYield] = useState("");
  const [minBeta, setMinBeta] = useState("");
  const [maxBeta, setMaxBeta] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortAsc, setSortAsc] = useState(false);

  const runScreen = useCallback(
    async (overrides?: Record<string, string>) => {
      setLoading(true);
      setHasSearched(true);
      try {
        const params = new URLSearchParams();
        if (overrides) {
          for (const [k, v] of Object.entries(overrides)) {
            if (v) params.set(k, v);
          }
        } else {
          if (sector) params.set("sector", sector);
          if (minPE) params.set("minPE", minPE);
          if (maxPE) params.set("maxPE", maxPE);
          if (minDividendYield) params.set("minDividendYield", minDividendYield);
          if (maxDividendYield) params.set("maxDividendYield", maxDividendYield);
          if (minBeta) params.set("minBeta", minBeta);
          if (maxBeta) params.set("maxBeta", maxBeta);
        }

        const res = await fetch(`/api/screener?${params.toString()}`, {
          credentials: "include",
        });
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    },
    [sector, minPE, maxPE, minDividendYield, maxDividendYield, minBeta, maxBeta]
  );

  useEffect(() => {
    const presetName = searchParams.get("preset");
    const urlSector = searchParams.get("sector");

    if (presetName && PRESETS[presetName]) {
      const p = PRESETS[presetName];
      if (p.sector) setSector(p.sector);
      if (p.maxPE) setMaxPE(p.maxPE);
      if (p.minPE) setMinPE(p.minPE);
      if (p.minDividendYield) setMinDividendYield(p.minDividendYield);
      if (p.maxBeta) setMaxBeta(p.maxBeta);
      if (p.minBeta) setMinBeta(p.minBeta);
      runScreen(p);
    } else if (urlSector) {
      setSector(urlSector);
      runScreen({ sector: urlSector });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return sortAsc ? av - bv : bv - av;
    }
    return sortAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  async function addToWatchlist(symbol: string, name: string) {
    setAddingSymbol(symbol);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, name }),
      });
    } catch {
      // fail silently
    } finally {
      setAddingSymbol(null);
    }
  }

  function SortableHeader({
    label,
    field,
    align = "left",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "right";
  }) {
    return (
      <th
        className={`px-3 py-3 text-${align} cursor-pointer select-none hover:text-foreground transition-colors`}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortKey === field && (
            <ArrowUpDown className="h-3 w-3 text-accent" />
          )}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-8 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Stock Screener
          </h1>
          <p className="text-sm text-muted">
            Filter stocks by fundamental criteria from a universe of 50
            large-cap names.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4 text-accent" />
          Filters
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Sector</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All Sectors</option>
              {SECTORS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              P/E Ratio
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPE}
                onChange={(e) => setMinPE(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPE}
                onChange={(e) => setMaxPE(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              Div Yield %
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                step="0.1"
                value={minDividendYield}
                onChange={(e) => setMinDividendYield(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Max"
                step="0.1"
                value={maxDividendYield}
                onChange={(e) => setMaxDividendYield(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Beta</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                step="0.1"
                value={minBeta}
                onChange={(e) => setMinBeta(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Max"
                step="0.1"
                value={maxBeta}
                onChange={(e) => setMaxBeta(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => runScreen()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Screening..." : "Run Screen"}
          </button>
          <span className="text-xs text-muted">
            {hasSearched && !loading && `${results.length} results`}
          </span>
        </div>
      </section>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="h-14 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Filter className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            No stocks matched your criteria. Try widening your filters.
          </p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <section className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
                <SortableHeader label="Symbol" field="symbol" />
                <SortableHeader label="Sector" field="sector" />
                <SortableHeader label="Mkt Cap" field="marketCap" align="right" />
                <SortableHeader label="Price" field="price" align="right" />
                <SortableHeader label="Chg %" field="dayChangePct" align="right" />
                <SortableHeader label="P/E" field="pe" align="right" />
                <SortableHeader label="Fwd P/E" field="forwardPE" align="right" />
                <SortableHeader label="Div Yield" field="dividendYield" align="right" />
                <SortableHeader label="Beta" field="beta" align="right" />
                <SortableHeader label="Rev Growth" field="revenueGrowth" align="right" />
                <SortableHeader label="Margin" field="profitMargins" align="right" />
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.symbol}
                  className="border-b border-border last:border-0 hover:bg-card-hover transition-colors"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/stocks?symbol=${r.symbol}`}
                      className="font-medium hover:text-accent transition-colors"
                    >
                      {r.symbol}
                    </Link>
                    <span className="block text-xs text-muted truncate max-w-[120px]">
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{r.sector}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fmtCap(r.marketCap)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fmtPrice(r.price)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right tabular-nums ${r.dayChangePct >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {r.dayChangePct >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {fmtPct(r.dayChangePct)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fmtNum(r.pe)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fmtNum(r.forwardPE)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.dividendYield > 0 ? `${r.dividendYield.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fmtNum(r.beta)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right tabular-nums ${r.revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {r.revenueGrowth ? fmtPct(r.revenueGrowth) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.profitMargins
                      ? `${r.profitMargins.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Add to watchlist"
                        disabled={addingSymbol === r.symbol}
                        onClick={() => addToWatchlist(r.symbol, r.name)}
                        className="text-muted hover:text-accent transition-colors disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default function ScreenerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 gap-2 text-muted">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading screener...
        </div>
      }
    >
      <ScreenerContent />
    </Suspense>
  );
}

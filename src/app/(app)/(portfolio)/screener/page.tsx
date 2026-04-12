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
  X,
  TrendingUp,
  Shield,
  Landmark,
  Star,
  BarChart2,
  DollarSign,
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
  recommendationMean: number;
  recommendationKey: string;
  debtToEquity: number;
  currentRatio: number;
  priceToBook: number;
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

const PRESETS: {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  filters: Record<string, string>;
}[] = [
  {
    id: "undervalued",
    label: "Undervalued",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    description: "P/E below 15",
    filters: { maxPE: "15" },
  },
  {
    id: "growth-tech",
    label: "Growth",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    description: "Revenue growth >10%",
    filters: { minRevenueGrowth: "10" },
  },
  {
    id: "dividends",
    label: "Dividends",
    icon: <Landmark className="h-3.5 w-3.5" />,
    description: "Yield above 3%",
    filters: { minDividendYield: "3" },
  },
  {
    id: "balance-sheet",
    label: "Strong Balance Sheet",
    icon: <BarChart2 className="h-3.5 w-3.5" />,
    description: "Low debt, high current ratio",
    filters: { maxDebtToEquity: "80", minCurrentRatio: "1.5" },
  },
  {
    id: "mega-cap",
    label: "Mega-Cap",
    icon: <Star className="h-3.5 w-3.5" />,
    description: "Market cap >$200B",
    filters: { minMarketCap: "200000000000" },
  },
  {
    id: "defensive",
    label: "Defensive",
    icon: <Shield className="h-3.5 w-3.5" />,
    description: "Beta below 0.8",
    filters: { maxBeta: "0.8" },
  },
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

function RecoBadge({ rec }: { rec: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    "strong buy": { label: "Strong Buy", cls: "bg-green-500/20 text-green-400" },
    buy: { label: "Buy", cls: "bg-green-500/15 text-green-500" },
    hold: { label: "Hold", cls: "bg-yellow-500/15 text-yellow-400" },
    sell: { label: "Sell", cls: "bg-red-500/15 text-red-400" },
    "strong sell": { label: "Strong Sell", cls: "bg-red-500/20 text-red-500" },
    underperform: { label: "Underperform", cls: "bg-red-500/15 text-red-400" },
    outperform: { label: "Outperform", cls: "bg-green-500/15 text-green-500" },
  };
  const info = map[rec?.toLowerCase()] ?? null;
  if (!info) return null;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${info.cls}`}
    >
      {info.label}
    </span>
  );
}

const EMPTY_FILTERS = {
  sector: "",
  query: "",
  minPE: "",
  maxPE: "",
  minDividendYield: "",
  maxDividendYield: "",
  minBeta: "",
  maxBeta: "",
  minRevenueGrowth: "",
  minMarketCap: "",
};

function ScreenerContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortAsc, setSortAsc] = useState(false);

  function setFilter(key: keyof typeof EMPTY_FILTERS, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const runScreen = useCallback(
    async (apiFilters: Record<string, string>) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(apiFilters)) {
          if (v) params.set(k, v);
        }
        const res = await fetch(`/api/screener?${params.toString()}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `Request failed (${res.status})`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Run with current filter state
  function applyFilters() {
    setActivePreset(null);
    runScreen({
      sector: filters.sector,
      minPE: filters.minPE,
      maxPE: filters.maxPE,
      minDividendYield: filters.minDividendYield,
      maxDividendYield: filters.maxDividendYield,
      minBeta: filters.minBeta,
      maxBeta: filters.maxBeta,
      minRevenueGrowth: filters.minRevenueGrowth,
      minMarketCap: filters.minMarketCap,
    });
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const next = { ...EMPTY_FILTERS, ...preset.filters };
    setFilters(next);
    setActivePreset(preset.id);
    runScreen(preset.filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setActivePreset(null);
    runScreen({});
  }

  // Auto-load on mount
  useEffect(() => {
    const presetName = searchParams.get("preset");
    const urlSector = searchParams.get("sector");

    if (presetName) {
      const preset = PRESETS.find((p) => p.id === presetName);
      if (preset) {
        applyPreset(preset);
        return;
      }
    }
    if (urlSector) {
      const next = { ...EMPTY_FILTERS, sector: urlSector };
      setFilters(next);
      runScreen({ sector: urlSector });
      return;
    }
    // Default: load all
    runScreen({});
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

  // Client-side text filter
  const displayed = [...results]
    .filter((r) => {
      const q = filters.query.toLowerCase();
      if (!q) return true;
      return (
        r.symbol.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
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

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => k !== "query" && v !== ""
  );

  function SortableHeader({
    label,
    field,
    align = "left",
    title,
    className = "",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "right";
    title?: string;
    className?: string;
  }) {
    return (
      <th
        title={title}
        className={`px-3 py-3 text-${align} cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap ${className}`}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortKey === field ? (
            <ArrowUpDown className="h-3 w-3 text-accent" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-20" />
          )}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="text-2xl font-bold font-serif mb-1">Stock Screener</h1>
        <p className="text-sm text-muted">
          Filter 50 large-cap S&P 500 names by fundamentals.
        </p>
      </header>

      {/* Preset Chips */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            onClick={() => applyPreset(p)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              activePreset === p.id
                ? "bg-accent text-white border-accent"
                : "bg-card border-border text-muted hover:text-foreground hover:border-accent/50"
            }`}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-accent" />
            Filters
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Search + Sector row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              Search ticker / name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="AAPL, Apple…"
                value={filters.query}
                onChange={(e) => setFilter("query", e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Sector</label>
            <select
              value={filters.sector}
              onChange={(e) => setFilter("sector", e.target.value)}
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
            <label className="text-xs font-medium text-muted">P/E Ratio</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPE}
                onChange={(e) => setFilter("minPE", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPE}
                onChange={(e) => setFilter("maxPE", e.target.value)}
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
                value={filters.minDividendYield}
                onChange={(e) => setFilter("minDividendYield", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Max"
                step="0.1"
                value={filters.maxDividendYield}
                onChange={(e) => setFilter("maxDividendYield", e.target.value)}
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
                value={filters.minBeta}
                onChange={(e) => setFilter("minBeta", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Max"
                step="0.1"
                value={filters.maxBeta}
                onChange={(e) => setFilter("maxBeta", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              Min Rev Growth %
            </label>
            <input
              type="number"
              placeholder="e.g. 10"
              step="1"
              value={filters.minRevenueGrowth}
              onChange={(e) => setFilter("minRevenueGrowth", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              Min Market Cap
            </label>
            <select
              value={filters.minMarketCap}
              onChange={(e) => setFilter("minMarketCap", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Any</option>
              <option value="1000000000">$1B+</option>
              <option value="10000000000">$10B+</option>
              <option value="50000000000">$50B+</option>
              <option value="200000000000">$200B+</option>
              <option value="500000000000">$500B+</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Screening…" : "Run Screen"}
          </button>
          {!loading && (
            <span className="text-xs text-muted">
              {displayed.length !== results.length
                ? `${displayed.length} of ${results.length} results`
                : `${results.length} results`}
            </span>
          )}
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>Error: {error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-4 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div
              key={n}
              className="h-14 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && results.length > 0 && displayed.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Search className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            No stocks match &ldquo;{filters.query}&rdquo;.
          </p>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Filter className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            No stocks matched your criteria. Try widening your filters or select
            a preset above.
          </p>
        </div>
      )}

      {/* Results table */}
      {!loading && displayed.length > 0 && (
        <section className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
                <SortableHeader label="Symbol" field="symbol" />
                <SortableHeader label="Sector" field="sector" />
                <SortableHeader
                  label="Mkt Cap"
                  field="marketCap"
                  align="right"
                />
                <SortableHeader label="Price" field="price" align="right" />
                <SortableHeader
                  label="Chg %"
                  field="dayChangePct"
                  align="right"
                />
                <SortableHeader
                  label="P/E"
                  field="pe"
                  align="right"
                  title="Trailing P/E"
                />
                <SortableHeader
                  label="Fwd P/E"
                  field="forwardPE"
                  align="right"
                  title="Forward P/E"
                  className="hidden sm:table-cell"
                />
                <SortableHeader
                  label="Yield"
                  field="dividendYield"
                  align="right"
                  title="Dividend Yield"
                />
                <SortableHeader
                  label="Beta"
                  field="beta"
                  align="right"
                  title="3-year beta"
                  className="hidden sm:table-cell"
                />
                <SortableHeader
                  label="Rev Gr"
                  field="revenueGrowth"
                  align="right"
                  title="YoY Revenue Growth"
                />
                <SortableHeader
                  label="Margin"
                  field="profitMargins"
                  align="right"
                  title="Net Profit Margin"
                  className="hidden sm:table-cell"
                />
                <th className="px-3 py-3 text-left text-xs text-muted uppercase tracking-wide">
                  Rating
                </th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => (
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
                  <td
                    className="px-3 py-3 text-xs text-muted"
                    title={r.industry || undefined}
                  >
                    {r.sector}
                  </td>
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
                  <td className="hidden sm:table-cell px-3 py-3 text-right tabular-nums">
                    {fmtNum(r.forwardPE)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.dividendYield > 0
                      ? `${r.dividendYield.toFixed(2)}%`
                      : "—"}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 text-right tabular-nums">
                    {fmtNum(r.beta)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right tabular-nums ${r.revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {r.revenueGrowth ? fmtPct(r.revenueGrowth) : "—"}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 text-right tabular-nums">
                    {r.profitMargins
                      ? `${r.profitMargins.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <RecoBadge rec={r.recommendationKey} />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      title="Add to watchlist"
                      disabled={addingSymbol === r.symbol}
                      onClick={() => addToWatchlist(r.symbol, r.name)}
                      className="flex items-center justify-center min-h-[44px] min-w-[44px] text-muted hover:text-accent transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
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
          Loading screener…
        </div>
      }
    >
      <ScreenerContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SymbolSearch from "@/components/SymbolSearch";
import BullsBears from "@/components/BullsBears";
import OverviewTab from "@/components/stocks/OverviewTab";
import ValuationTab from "@/components/stocks/ValuationTab";
import FinancialsTab from "@/components/stocks/FinancialsTab";
import ForecastTab from "@/components/stocks/ForecastTab";
import CompareTab from "@/components/stocks/CompareTab";
import HistoricalPriceTab from "@/components/stocks/HistoricalPriceTab";
import SolvencyTab from "@/components/stocks/SolvencyTab";
import DividendsTab from "@/components/stocks/DividendsTab";
import TransactionsTab from "@/components/stocks/TransactionsTab";
import PeopleTab from "@/components/stocks/PeopleTab";
import SECFilingsTab from "@/components/stocks/SECFilingsTab";
import StocksMarketMovers from "@/components/stocks/StocksMarketMovers";
import RecentStocksRow from "@/components/stocks/RecentStocksRow";
import StocksEarningsThisWeek from "@/components/stocks/StocksEarningsThisWeek";
import ExtendedHoursInline from "@/components/ExtendedHoursInline";
import { pushRecentStock, readRecentStocks, type RecentStockEntry } from "@/lib/recentStocks";
import { getExtendedHoursLine } from "@/lib/extendedHours";
import type { QuoteSummaryData, QuoteSummaryHeavyPatch, StockQuote } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const SUB_TABS = [
  "Overview",
  "Bulls & Bears",
  "Valuation",
  "Financials",
  "Forecast",
  "Compare",
  "Historical Price",
  "Solvency",
  "Dividends",
  "Transactions",
  "People",
  "SEC Filings",
] as const;

type SubTab = (typeof SUB_TABS)[number];

const SUBTAB_TO_SLUG: Record<SubTab, string> = {
  Overview: "overview",
  "Bulls & Bears": "bulls-bears",
  Valuation: "valuation",
  Financials: "financials",
  Forecast: "forecast",
  Compare: "compare",
  "Historical Price": "historical",
  Solvency: "solvency",
  Dividends: "dividends",
  Transactions: "transactions",
  People: "people",
  "SEC Filings": "sec-filings",
};

const SLUG_TO_SUBTAB: Record<string, SubTab> = Object.fromEntries(
  (Object.entries(SUBTAB_TO_SLUG) as [SubTab, string][]).map(([label, slug]) => [slug, label]),
) as Record<string, SubTab>;

function subTabFromSlug(raw: string | null): SubTab {
  if (!raw?.trim()) return "Overview";
  const slug = raw.trim().toLowerCase();
  return SLUG_TO_SUBTAB[slug] ?? "Overview";
}

function subTabToSlug(tab: SubTab): string {
  return SUBTAB_TO_SLUG[tab];
}

function formatMarketCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

function HeaderSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-14 rounded bg-border" />
            <div className="h-5 w-20 rounded bg-border" />
            <div className="h-5 w-24 rounded-full bg-border" />
          </div>
          <div className="h-6 w-44 rounded bg-border" />
          <div className="h-9 w-36 rounded bg-border" />
        </div>
        <div className="flex gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-14 rounded bg-border" />
              <div className="h-5 w-16 rounded bg-border" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <div className="h-3 w-20 rounded bg-border" />
          <div className="h-3 w-20 rounded bg-border" />
        </div>
        <div className="h-1.5 rounded-full bg-border" />
      </div>
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        {[1,2,3,4,5,6,7,8].map((i) => (
          <div key={i} className="h-7 w-20 rounded-lg bg-border" />
        ))}
      </div>
    </div>
  );
}

function AnalysisPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState("");
  const [displayName, setDisplayName] = useState("");
  const activeTab = subTabFromSlug(searchParams.get("tab"));
  const [data, setData] = useState<QuoteSummaryData | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [recentStocks, setRecentStocks] = useState<RecentStockEntry[]>([]);

  const checkTabScroll = useCallback(() => {
    const el = tabBarRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkTabScroll();
    const el = tabBarRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkTabScroll);
    const ro = new ResizeObserver(checkTabScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkTabScroll);
      ro.disconnect();
    };
  }, [checkTabScroll, symbol]);

  useEffect(() => {
    setRecentStocks(readRecentStocks());
  }, []);

  const fetchSymbolData = useCallback(async (sym: string, signal: AbortSignal) => {
    if (!sym.trim()) {
      setData(null);
      setQuote(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(null);
    setQuote(null);

    const qUrl = `/api/stocks?action=quote&symbol=${encodeURIComponent(sym)}`;
    const sUrl = `/api/stocks?action=summary&symbol=${encodeURIComponent(sym)}`;

    function mergeHeavy() {
      const hUrl = `/api/stocks?action=summaryHeavy&symbol=${encodeURIComponent(sym)}`;
      fetch(hUrl)
        .then((r) => (r.ok ? r.json() : null))
        .then((patch: QuoteSummaryHeavyPatch | null) => {
          if (!patch) return;
          setData((prev) => (prev ? { ...prev, ...patch } : null));
        })
        .catch(() => {
          /* ignore */
        });
    }

    try {
      await Promise.allSettled([
        fetch(qUrl, { signal }).then(async (res) => {
          if (signal.aborted || !res.ok) return;
          const q: StockQuote = await res.json();
          if (signal.aborted) return;
          setQuote(q);
          if (q.shortName) setDisplayName(q.shortName);
        }),
        fetch(sUrl, { signal }).then(async (res) => {
          if (signal.aborted || !res.ok) return;
          const summary: QuoteSummaryData = await res.json();
          if (signal.aborted) return;
          setData(summary);
          if (summary.shortName) setDisplayName(summary.shortName);
          const next = pushRecentStock(sym, summary.shortName || summary.longName || sym);
          setRecentStocks(next);
          mergeHeavy();
        }),
      ]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlSymbol = searchParams.get("symbol")?.trim().toUpperCase();
    if (urlSymbol) setSymbol(urlSymbol);
    else setSymbol("");
  }, [searchParams]);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      setQuote(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    fetchSymbolData(symbol, ac.signal);
    return () => ac.abort();
  }, [symbol, fetchSymbolData]);

  function analysisHref(next: { symbol?: string; tab: SubTab }) {
    const qs = new URLSearchParams();
    const sym = next.symbol !== undefined ? next.symbol : symbol;
    if (sym.trim()) qs.set("symbol", sym.trim());
    qs.set("tab", subTabToSlug(next.tab));
    const q = qs.toString();
    return q ? `/analysis?${q}` : "/analysis";
  }

  function handleSymbolSelect(sym: string, name: string) {
    setSymbol(sym);
    setDisplayName(name);
    router.replace(analysisHref({ symbol: sym, tab: activeTab }), { scroll: false });
  }

  function handleClearSymbol() {
    setDisplayName("");
    setSymbol("");
    setQuote(null);
    router.replace("/analysis", { scroll: false });
  }

  function handleTabChange(tab: SubTab) {
    router.replace(analysisHref({ tab }), { scroll: false });
    // scroll active tab into view
    setTimeout(() => {
      const el = tabBarRef.current;
      if (!el) return;
      const btn = el.querySelector(`[data-tab="${tab}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ block: "nearest", inline: "center" });
    }, 0);
  }

  const headerRow = data ?? quote;
  const isPositive = (headerRow?.regularMarketChange ?? 0) >= 0;
  const priceFmt = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const extendedHoursLine = headerRow ? getExtendedHoursLine(headerRow) : null;

  function renderTab() {
    if (!symbol) {
      return null;
    }
    if (activeTab === "Compare") {
      return <CompareTab currentSymbol={symbol} />;
    }
    if (activeTab === "Historical Price") {
      return <HistoricalPriceTab symbol={symbol} summaryData={data ?? undefined} />;
    }
    if (activeTab === "Bulls & Bears") {
      return <BullsBears ticker={symbol} />;
    }
    if (activeTab === "SEC Filings") {
      return <SECFilingsTab symbol={symbol} />;
    }
    if (!data) {
      return (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 gap-3 text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm">Loading fundamentals…</p>
        </div>
      );
    }
    switch (activeTab) {
      case "Overview":
        return <OverviewTab data={data} symbol={symbol} onViewChart={() => handleTabChange("Historical Price")} />;
      case "Valuation":
        return <ValuationTab data={data} />;
      case "Financials":
        return <FinancialsTab data={data} />;
      case "Forecast":
        return <ForecastTab data={data} />;
      case "Solvency":
        return <SolvencyTab data={data} />;
      case "Dividends":
        return <DividendsTab data={data} />;
      case "Transactions":
        return <TransactionsTab data={data} />;
      case "People":
        return <PeopleTab data={data} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4 min-w-0">
      <SymbolSearch
        onSelect={handleSymbolSelect}
        onClear={handleClearSymbol}
        initialSymbol={symbol}
        placeholder="Search symbol (e.g. AAPL, ASML.AS, VOD.L)…"
      />
      {!symbol && (
        <div className="space-y-4 min-w-0">
          <RecentStocksRow entries={recentStocks} onSelect={handleSymbolSelect} />
          <StocksMarketMovers onSelectSymbol={handleSymbolSelect} />
          <StocksEarningsThisWeek />
        </div>
      )}

      {/* Stock header — quote (fast) can render before full summary */}
      {symbol && loading && !headerRow ? (
        <HeaderSkeleton />
      ) : headerRow ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {/* Row 1: name/price + primary stats */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 min-w-0">
            {/* Name + price */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-semibold text-muted bg-background border border-border rounded px-1.5 py-0.5 shrink-0">
                  {symbol}
                </span>
                {(data?.exchangeName || quote?.exchangeName) && (
                  <span className="text-xs text-muted shrink-0">
                    {data?.exchangeName || quote?.exchangeName}
                  </span>
                )}
                {data?.sector && (
                  <span className="text-xs bg-accent/10 text-accent border border-accent/20 rounded-full px-2 py-0.5 shrink-0 truncate max-w-[160px]">
                    {data.sector}
                  </span>
                )}
                {data?.industry && (
                  <span className="text-xs text-muted/70 truncate max-w-[180px] hidden sm:inline">
                    {data.industry}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold font-serif truncate">
                {displayName || headerRow.shortName || symbol}
              </h1>
              <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                <span className="text-3xl font-bold font-mono tabular-nums">
                  ${priceFmt(headerRow.regularMarketPrice)}
                </span>
                <span
                  className={`flex items-center gap-1 text-base font-mono font-medium tabular-nums ${
                    isPositive ? "text-green" : "text-red"
                  }`}
                >
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {isPositive ? "+" : ""}
                  {priceFmt(headerRow.regularMarketChange)}&nbsp;
                  <span className="text-sm opacity-80">
                    ({isPositive ? "+" : ""}{headerRow.regularMarketChangePercent.toFixed(2)}%)
                  </span>
                </span>
                {extendedHoursLine && (
                  <ExtendedHoursInline line={extendedHoursLine} className="mt-1.5 w-full" />
                )}
              </div>
            </div>

            {/* Primary stats: market cap + volume + analyst + beta */}
            <div className="flex flex-row flex-wrap gap-x-5 gap-y-3 shrink-0 items-start sm:text-right">
              {[
                { label: "Market Cap", value: headerRow.marketCap ? formatMarketCap(headerRow.marketCap) : "—" },
                { label: "Volume", value: headerRow.regularMarketVolume ? fmtVolume(headerRow.regularMarketVolume) : "—" },
                {
                  label: "Analyst Target",
                  value: data?.targetMeanPrice ? `$${priceFmt(data.targetMeanPrice)}` : "—",
                  sub: data?.numberOfAnalystOpinions ? `${data.numberOfAnalystOpinions} analysts` : undefined,
                },
                { label: "Beta", value: data?.beta != null ? data.beta.toFixed(2) : "—" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-muted uppercase tracking-wide">{label}</span>
                  <span className="text-sm font-mono font-semibold tabular-nums">{value}</span>
                  {sub && <span className="text-[10px] text-muted">{sub}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: 52W range bar */}
          {headerRow.fiftyTwoWeekLow > 0 &&
            headerRow.fiftyTwoWeekHigh > 0 &&
            headerRow.fiftyTwoWeekHigh !== headerRow.fiftyTwoWeekLow && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                <span>52W Low&nbsp; <span className="text-foreground font-medium">${priceFmt(headerRow.fiftyTwoWeekLow)}</span></span>
                <span className="text-[10px] text-muted/60">52-week range</span>
                <span>52W High&nbsp; <span className="text-foreground font-medium">${priceFmt(headerRow.fiftyTwoWeekHigh)}</span></span>
              </div>
              <div className="relative h-1.5 rounded-full bg-border overflow-visible">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red/60 via-accent/80 to-green/60"
                  style={{
                    width: `${Math.min(100, Math.max(0,
                      ((headerRow.regularMarketPrice - headerRow.fiftyTwoWeekLow) /
                        (headerRow.fiftyTwoWeekHigh - headerRow.fiftyTwoWeekLow)) * 100
                    ))}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-1.5 rounded-full bg-foreground shadow border border-border"
                  style={{
                    left: `${Math.min(100, Math.max(0,
                      ((headerRow.regularMarketPrice - headerRow.fiftyTwoWeekLow) /
                        (headerRow.fiftyTwoWeekHigh - headerRow.fiftyTwoWeekLow)) * 100
                    ))}%`,
                  }}
                />
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* Tab bar */}
      {symbol && (
        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Scroll tabs left"
              onClick={() => tabBarRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
              className="absolute left-0 top-0 bottom-px z-10 flex items-center justify-center w-8 bg-gradient-to-r from-background to-transparent cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-muted" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Scroll tabs right"
              onClick={() => tabBarRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
              className="absolute right-0 top-0 bottom-px z-10 flex items-center justify-center w-8 bg-gradient-to-l from-background to-transparent cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-muted" />
            </button>
          )}
          <div className="relative">
            <div
              ref={tabBarRef}
              className="sticky top-[92px] z-20 flex items-center gap-1 overflow-x-auto border-b border-border bg-background -mx-3 px-3 pb-px scrollbar-hide scroll-smooth sm:static sm:mx-0 sm:px-0"
            >
              {SUB_TABS.map((tab) => (
                <button
                  key={tab}
                  data-tab={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`whitespace-nowrap px-2 py-2 sm:px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    tab === activeTab
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground hover:border-border"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
          </div>
        </div>
      )}

      <div>{renderTab()}</div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 min-w-0">
          <div className="h-11 rounded-xl bg-card border border-border animate-pulse" />
          <div className="h-28 rounded-xl bg-card border border-border animate-pulse" />
          <div className="h-9 rounded-lg bg-card border border-border animate-pulse" />
        </div>
      }
    >
      <AnalysisPageContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SymbolSearch from "@/components/SymbolSearch";
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
import type { QuoteSummaryData } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  CandlestickChart,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const SUB_TABS = [
  "Overview",
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

const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "META", name: "Meta" },
  { symbol: "JPM", name: "JPMorgan" },
];

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

function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || isNaN(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

function buildMetricChips(d: QuoteSummaryData): { label: string; value: string; highlight?: string }[] {
  const chips: { label: string; value: string; highlight?: string }[] = [];
  const pf = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (d.trailingPE) chips.push({ label: "P/E TTM", value: d.trailingPE.toFixed(2) });
  if (d.forwardPE) chips.push({ label: "Fwd P/E", value: d.forwardPE.toFixed(2) });
  if (d.priceToBook) chips.push({ label: "P/B", value: d.priceToBook.toFixed(2) });
  if (d.priceToSalesTrailing12Months) chips.push({ label: "P/S", value: d.priceToSalesTrailing12Months.toFixed(2) });
  if (d.trailingEps) chips.push({ label: "EPS TTM", value: `$${pf(d.trailingEps)}` });
  if (d.forwardEps) chips.push({ label: "Fwd EPS", value: `$${pf(d.forwardEps)}` });
  if (d.revenueGrowth != null) chips.push({
    label: "Rev Growth",
    value: fmtPct(d.revenueGrowth),
    highlight: d.revenueGrowth >= 0 ? "text-green" : "text-red",
  });
  if (d.earningsGrowth != null) chips.push({
    label: "EPS Growth",
    value: fmtPct(d.earningsGrowth),
    highlight: d.earningsGrowth >= 0 ? "text-green" : "text-red",
  });
  if (d.grossMargins != null) chips.push({ label: "Gross Margin", value: fmtPct(d.grossMargins) });
  if (d.operatingMargins != null) chips.push({ label: "Op Margin", value: fmtPct(d.operatingMargins) });
  if (d.profitMargins != null) chips.push({ label: "Net Margin", value: fmtPct(d.profitMargins) });
  if (d.returnOnEquity != null) chips.push({ label: "ROE", value: fmtPct(d.returnOnEquity) });
  if (d.returnOnAssets != null) chips.push({ label: "ROA", value: fmtPct(d.returnOnAssets) });
  if (d.dividendYield) chips.push({
    label: "Div Yield",
    value: fmtPct(d.dividendYield),
    highlight: "text-accent",
  });
  if (d.debtToEquity) chips.push({ label: "D/E", value: `${d.debtToEquity.toFixed(1)}×` });
  if (d.freeCashflow) chips.push({ label: "FCF", value: formatMarketCap(d.freeCashflow) });
  if (d.heldPercentInstitutions) chips.push({ label: "Inst. Owned", value: fmtPct(d.heldPercentInstitutions) });
  return chips;
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

function StocksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [activeTab, setActiveTab] = useState<SubTab>("Overview");
  const [data, setData] = useState<QuoteSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const fetchSummary = useCallback(async (sym: string) => {
    if (!sym.trim()) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/stocks?action=summary&symbol=${encodeURIComponent(sym)}`
      );
      if (res.ok) {
        const result: QuoteSummaryData = await res.json();
        setData(result);
        if (result.shortName) setDisplayName(result.shortName);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlSymbol = searchParams.get("symbol")?.trim().toUpperCase();
    if (urlSymbol) setSymbol(urlSymbol);

    const urlTab = searchParams.get("tab") as SubTab | null;
    if (urlTab && (SUB_TABS as readonly string[]).includes(urlTab)) {
      setActiveTab(urlTab as SubTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (symbol) {
      fetchSummary(symbol);
    } else {
      setData(null);
      setLoading(false);
    }
  }, [symbol, fetchSummary]);

  function handleSymbolSelect(sym: string, name: string) {
    setSymbol(sym);
    setDisplayName(name);
    router.replace(
      `/stocks?symbol=${encodeURIComponent(sym)}&tab=${encodeURIComponent(activeTab)}`,
      { scroll: false }
    );
  }

  function handleTabChange(tab: SubTab) {
    setActiveTab(tab);
    router.replace(
      `/stocks?symbol=${encodeURIComponent(symbol)}&tab=${encodeURIComponent(tab)}`,
      { scroll: false }
    );
    // scroll active tab into view
    setTimeout(() => {
      const el = tabBarRef.current;
      if (!el) return;
      const btn = el.querySelector(`[data-tab="${tab}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ block: "nearest", inline: "center" });
    }, 0);
  }

  const isPositive = (data?.regularMarketChange ?? 0) >= 0;
  const priceFmt = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function renderTab() {
    if (!symbol) {
      return (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-6 text-center min-h-[320px]">
          <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
            <CandlestickChart className="h-7 w-7 text-accent" />
          </div>
          <div>
            <p className="text-lg font-semibold mb-1">Search for any stock</p>
            <p className="text-sm text-muted max-w-sm">
              Enter a symbol or company name above to view fundamentals, charts, filings, and more.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_SYMBOLS.map(({ symbol: sym, name }) => (
              <button
                key={sym}
                type="button"
                onClick={() => handleSymbolSelect(sym, name)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-card-hover hover:border-accent/50 px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer"
              >
                <Search className="h-3 w-3 text-muted" />
                <span className="text-accent font-mono font-semibold">{sym}</span>
                <span className="text-muted">{name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (activeTab === "Compare") {
      return <CompareTab currentSymbol={symbol} />;
    }
    if (activeTab === "Historical Price") {
      return <HistoricalPriceTab symbol={symbol} summaryData={data ?? undefined} />;
    }
    if (activeTab === "SEC Filings") {
      return <SECFilingsTab symbol={symbol} />;
    }
    if (!data) return null;
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
      <SymbolSearch onSelect={handleSymbolSelect} initialSymbol={symbol} />

      {/* Stock header */}
      {loading ? (
        <HeaderSkeleton />
      ) : data ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {/* Row 1: name/price + primary stats */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 min-w-0">
            {/* Name + price */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-semibold text-muted bg-background border border-border rounded px-1.5 py-0.5 shrink-0">
                  {symbol}
                </span>
                {data.exchangeName && (
                  <span className="text-xs text-muted shrink-0">{data.exchangeName}</span>
                )}
                {data.sector && (
                  <span className="text-xs bg-accent/10 text-accent border border-accent/20 rounded-full px-2 py-0.5 shrink-0 truncate max-w-[160px]">
                    {data.sector}
                  </span>
                )}
                {data.industry && (
                  <span className="text-xs text-muted/70 truncate max-w-[180px] hidden sm:inline">
                    {data.industry}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold font-serif truncate">{displayName}</h1>
              <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                <span className="text-3xl font-bold font-mono tabular-nums">
                  ${priceFmt(data.regularMarketPrice)}
                </span>
                <span
                  className={`flex items-center gap-1 text-base font-mono font-medium tabular-nums ${
                    isPositive ? "text-green" : "text-red"
                  }`}
                >
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {isPositive ? "+" : ""}
                  {priceFmt(data.regularMarketChange)}&nbsp;
                  <span className="text-sm opacity-80">
                    ({isPositive ? "+" : ""}{data.regularMarketChangePercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>

            {/* Primary stats: market cap + volume + analyst + beta */}
            <div className="flex flex-row flex-wrap gap-x-5 gap-y-3 shrink-0 items-start sm:text-right">
              {[
                { label: "Market Cap", value: data.marketCap ? formatMarketCap(data.marketCap) : "—" },
                { label: "Volume", value: data.regularMarketVolume ? fmtVolume(data.regularMarketVolume) : "—" },
                {
                  label: "Analyst Target",
                  value: data.targetMeanPrice ? `$${priceFmt(data.targetMeanPrice)}` : "—",
                  sub: data.numberOfAnalystOpinions ? `${data.numberOfAnalystOpinions} analysts` : undefined,
                },
                { label: "Beta", value: data.beta ? data.beta.toFixed(2) : "—" },
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
          {data.fiftyTwoWeekLow && data.fiftyTwoWeekHigh && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                <span>52W Low&nbsp; <span className="text-foreground font-medium">${priceFmt(data.fiftyTwoWeekLow)}</span></span>
                <span className="text-[10px] text-muted/60">52-week range</span>
                <span>52W High&nbsp; <span className="text-foreground font-medium">${priceFmt(data.fiftyTwoWeekHigh)}</span></span>
              </div>
              <div className="relative h-1.5 rounded-full bg-border overflow-visible">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red/60 via-accent/80 to-green/60"
                  style={{
                    width: `${Math.min(100, Math.max(0,
                      ((data.regularMarketPrice - data.fiftyTwoWeekLow) /
                        (data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow)) * 100
                    ))}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-1.5 rounded-full bg-foreground shadow border border-border"
                  style={{
                    left: `${Math.min(100, Math.max(0,
                      ((data.regularMarketPrice - data.fiftyTwoWeekLow) /
                        (data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow)) * 100
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
              className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px scrollbar-hide scroll-smooth"
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

export default function StocksPage() {
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
      <StocksPageContent />
    </Suspense>
  );
}

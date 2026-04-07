"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
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
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

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

function StocksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [activeTab, setActiveTab] = useState<SubTab>("Overview");
  const [data, setData] = useState<QuoteSummaryData | null>(null);
  const [loading, setLoading] = useState(false);

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

  const isPositive = (data?.regularMarketChange ?? 0) >= 0;

  function renderTab() {
    if (!symbol) {
      return (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-1">Select a stock to get started</p>
          <p className="text-sm">Search for a symbol above to view company details, charts, and more.</p>
        </div>
      );
    }
    if (activeTab === "Compare") {
      return <CompareTab currentSymbol={symbol} />;
    }
    if (activeTab === "Historical Price") {
      return <HistoricalPriceTab symbol={symbol} />;
    }
    if (activeTab === "SEC Filings") {
      return <SECFilingsTab symbol={symbol} />;
    }
    if (!data) return null;
    switch (activeTab) {
      case "Overview":
        return <OverviewTab data={data} symbol={symbol} onViewChart={() => setActiveTab("Historical Price")} />;
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
    <div className="space-y-5 min-w-0">
      <SymbolSearch onSelect={handleSymbolSelect} initialSymbol={symbol} />

      {loading ? (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-muted text-sm">Loading stock data...</span>
        </div>
      ) : (
        data && (
          <div className="flex items-baseline gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold font-serif">{displayName}</h1>
              <span className="text-sm text-muted">{symbol}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono">
                $
                {data.regularMarketPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={`text-lg font-mono font-medium flex items-center gap-1 ${
                  isPositive ? "text-green" : "text-red"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {isPositive ? "+" : ""}
                {data.regularMarketChange.toFixed(2)} (
                {isPositive ? "+" : ""}
                {data.regularMarketChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )
      )}

      {symbol && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
          {SUB_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                router.replace(
                  `/stocks?symbol=${encodeURIComponent(symbol)}&tab=${encodeURIComponent(tab)}`,
                  { scroll: false }
                );
              }}
              className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === activeTab
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      <div>{renderTab()}</div>
    </div>
  );
}

export default function StocksPage() {
  return (
    <Suspense fallback={<div className="space-y-5 min-w-0 animate-pulse h-64 rounded-xl bg-card border border-border" />}>
      <StocksPageContent />
    </Suspense>
  );
}

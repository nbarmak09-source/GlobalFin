"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SymbolSearch from "@/components/SymbolSearch";
import DCFModel from "@/components/models/DCFModel";
import CompsModel from "@/components/models/CompsModel";
import LBOModel from "@/components/models/LBOModel";
import type { QuoteSummaryData, SECFinancials } from "@/lib/types";
import { Calculator, Loader2 } from "lucide-react";

const TABS = ["DCF", "Comps / Multiples", "LBO"] as const;
type ModelTab = (typeof TABS)[number];

function ModelsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [activeTab, setActiveTab] = useState<ModelTab>("DCF");
  const [quoteData, setQuoteData] = useState<QuoteSummaryData | null>(null);
  const [secData, setSecData] = useState<SECFinancials | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (sym: string) => {
    if (!sym.trim()) {
      setQuoteData(null);
      setSecData(null);
      return;
    }
    setLoading(true);
    try {
      const [quoteRes, secRes] = await Promise.all([
        fetch(`/api/stocks?action=summary&symbol=${encodeURIComponent(sym)}`),
        fetch(`/api/sec-financials?symbol=${encodeURIComponent(sym)}`),
      ]);
      if (quoteRes.ok) {
        const q: QuoteSummaryData = await quoteRes.json();
        setQuoteData(q);
        if (q.shortName) setDisplayName(q.shortName);
      }
      if (secRes.ok) {
        const s: SECFinancials = await secRes.json();
        setSecData(s);
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
    const urlTab = searchParams.get("tab") as ModelTab | null;
    if (urlTab && (TABS as readonly string[]).includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (symbol) fetchData(symbol);
    else {
      setQuoteData(null);
      setSecData(null);
    }
  }, [symbol, fetchData]);

  function handleSymbolSelect(sym: string, name: string) {
    setSymbol(sym);
    setDisplayName(name);
    router.replace(
      `/models?symbol=${encodeURIComponent(sym)}&tab=${encodeURIComponent(activeTab)}`,
      { scroll: false },
    );
  }

  function handleTabChange(tab: ModelTab) {
    setActiveTab(tab);
    if (symbol) {
      router.replace(
        `/models?symbol=${encodeURIComponent(symbol)}&tab=${encodeURIComponent(tab)}`,
        { scroll: false },
      );
    }
  }

  return (
    <div className="space-y-5 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Financial Models
          </h1>
          <p className="text-sm text-muted">
            Build DCF, comps, and LBO valuation models.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
          <Calculator className="h-3.5 w-3.5" />
          <span>Valuation</span>
        </div>
      </header>

      <SymbolSearch onSelect={handleSymbolSelect} initialSymbol={symbol} />

      {loading && (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-muted text-sm">Loading financial data…</span>
        </div>
      )}

      {!loading && quoteData && (
        <div className="flex items-baseline gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold font-serif">{displayName}</h2>
            <span className="text-sm text-muted">{symbol}</span>
          </div>
          <span className="text-2xl font-bold font-mono">
            $
            {quoteData.regularMarketPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-border pb-px">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
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

      <div>
        {!symbol ? (
          <div className="text-center py-20 text-muted">
            <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg mb-1">Select a stock to get started</p>
            <p className="text-sm">
              Search for a symbol above to build a valuation model.
            </p>
          </div>
        ) : !loading && quoteData ? (
          activeTab === "DCF" ? (
            <DCFModel
              key={symbol}
              data={quoteData}
              secData={secData}
              symbol={symbol}
            />
          ) : activeTab === "Comps / Multiples" ? (
            <CompsModel key={symbol} data={quoteData} symbol={symbol} />
          ) : (
            <LBOModel
              key={symbol}
              data={quoteData}
              secData={secData}
              symbol={symbol}
            />
          )
        ) : null}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5 min-w-0 animate-pulse h-64 rounded-xl bg-card border border-border" />
      }
    >
      <ModelsPageContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import SymbolSearch from "@/components/SymbolSearch";
import DCFModel from "@/components/models/DCFModel";
import CompsModel from "@/components/models/CompsModel";
import LBOModel from "@/components/models/LBOModel";
import type { QuoteSummaryData, SECFinancials } from "@/lib/types";
import { Calculator, Loader2 } from "lucide-react";

export type ModelToolKind = "dcf" | "comps" | "lbo";

const TOOL_LINKS: { kind: ModelToolKind; href: string; label: string }[] = [
  { kind: "dcf", href: "/models/dcf", label: "DCF" },
  { kind: "comps", href: "/models/comps", label: "Comps / Multiples" },
  { kind: "lbo", href: "/models/lbo", label: "LBO" },
];

type ShellConfig = {
  title: string;
  subtitle: string;
  badge: string;
};

const SHELL: Record<ModelToolKind, ShellConfig> = {
  dcf: {
    title: "DCF model",
    subtitle: "Discounted cash flow valuation from consensus and your assumptions.",
    badge: "Intrinsic value",
  },
  comps: {
    title: "Trading comps",
    subtitle: "Relative valuation using market multiples and peers.",
    badge: "Market multiples",
  },
  lbo: {
    title: "LBO model",
    subtitle: "Sponsor-style returns, debt stack, and exit scenarios.",
    badge: "Buyout",
  },
};

function ModelToolShellInner({ kind }: { kind: ModelToolKind }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [symbol, setSymbol] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [quoteData, setQuoteData] = useState<QuoteSummaryData | null>(null);
  const [secData, setSecData] = useState<SECFinancials | null>(null);
  const [loading, setLoading] = useState(false);

  const cfg = SHELL[kind];

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
        fetch(`/api/sec-financials?symbol=${encodeURIComponent(sym)}&refresh=1`),
      ]);
      if (quoteRes.ok) {
        const q: QuoteSummaryData = await quoteRes.json();
        setQuoteData(q);
        if (q.shortName) setDisplayName(q.shortName);
      }
      try {
        const s: SECFinancials = await secRes.json();
        if (
          secRes.ok &&
          Array.isArray(s.annualData) &&
          s.annualData.length > 0
        ) {
          setSecData(s);
        } else {
          setSecData(null);
        }
      } catch {
        setSecData(null);
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
  }, [searchParams]);

  useEffect(() => {
    if (symbol) fetchData(symbol);
    else {
      setQuoteData(null);
      setSecData(null);
    }
  }, [symbol, fetchData]);

  function withSymbol(href: string) {
    if (!symbol) return href;
    const u = new URL(href, "http://local");
    u.searchParams.set("symbol", symbol);
    return `${u.pathname}${u.search}`;
  }

  function handleSymbolSelect(sym: string, name: string) {
    setSymbol(sym);
    setDisplayName(name);
    router.replace(
      `${pathname}?symbol=${encodeURIComponent(sym)}`,
      { scroll: false },
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">{cfg.title}</h1>
          <p className="text-sm text-muted">{cfg.subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
          <Calculator className="h-3.5 w-3.5" />
          <span>{cfg.badge}</span>
        </div>
      </header>

      <nav
        className="flex flex-wrap items-center gap-1 border-b border-border pb-px"
        aria-label="Model tools"
      >
        <Link
          href={withSymbol("/models")}
          className="whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 border-transparent text-muted hover:text-foreground transition-colors"
        >
          Overview
        </Link>
        {TOOL_LINKS.map(({ kind: k, href, label }) => (
          <Link
            key={k}
            href={withSymbol(href)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              kind === k
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

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

      <div>
        {!symbol ? (
          <div className="text-center py-20 text-muted">
            <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg mb-1">Select a stock to get started</p>
            <p className="text-sm">
              Search for a symbol above to run this model.
            </p>
          </div>
        ) : !loading && quoteData ? (
          kind === "dcf" ? (
            <DCFModel
              key={symbol}
              data={quoteData}
              secData={secData}
              symbol={symbol}
            />
          ) : kind === "comps" ? (
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

export function ModelToolShell({ kind }: { kind: ModelToolKind }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-5 min-w-0 animate-pulse h-64 rounded-xl bg-card border border-border" />
      }
    >
      <ModelToolShellInner kind={kind} />
    </Suspense>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Bitcoin, Building2, CircleDollarSign, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import NewsCard from "@/components/NewsCard";
import type { NewsArticle, StockQuote } from "@/lib/types";

/** Major spot pairs + listed proxies; Yahoo omits unknown symbols from batch quotes. */
const CRYPTO_QUOTE_SYMBOLS = [
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "XRP-USD",
  "ADA-USD",
  "DOGE-USD",
  "AVAX-USD",
  "DOT-USD",
  "LINK-USD",
  "LTC-USD",
  "UNI-USD",
  "ATOM-USD",
  "XLM-USD",
  "SHIB-USD",
  "NEAR-USD",
  "APT-USD",
  "ARB-USD",
  "OP-USD",
  "COIN",
  "MSTR",
  "IBIT",
  "GBTC",
  "ETHE",
] as const;

function formatTokenPrice(price: number): string {
  if (!Number.isFinite(price)) return "—";
  const abs = Math.abs(price);
  if (abs > 0 && abs < 0.0001) {
    return price.toExponential(2);
  }
  if (abs < 1) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }
  if (abs < 1000) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type MarketTab = "all" | "spot" | "listed";

function QuoteCard({ q }: { q: StockQuote }) {
  const up = (q.regularMarketChangePercent ?? 0) >= 0;
  const spotPair = q.symbol.endsWith("-USD");

  return (
    <div
      className="group relative min-w-0 rounded-2xl border border-border/90 bg-gradient-to-br from-card via-card to-card-hover/40 p-4 shadow-sm transition-all duration-200 hover:border-accent/35 hover:shadow-[0_0_32px_-12px_rgba(201,162,39,0.35)]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="inline-flex items-center rounded-md border border-border/80 bg-background/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-accent">
          {q.symbol}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
            up
              ? "bg-emerald-500/12 text-emerald-400"
              : "bg-red-500/12 text-red-400"
          }`}
        >
          {q.regularMarketChangePercent != null
            ? `${up ? "+" : ""}${q.regularMarketChangePercent.toFixed(2)}%`
            : "—"}
        </span>
      </div>
      <p className="text-xs text-muted line-clamp-2 leading-snug mb-3 min-h-[2rem]">
        {q.shortName ?? q.symbol}
      </p>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[11px] text-muted font-medium uppercase tracking-wider">
          {spotPair ? "Spot" : "Listed"}
        </div>
        <div className="font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground">
          {formatTokenPrice(q.regularMarketPrice)}
        </div>
      </div>
    </div>
  );
}

export default function AlternativesCryptoPage() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [tab, setTab] = useState<MarketTab>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setQuotesLoading(true);
      try {
        const res = await fetch(
          `/api/stocks?action=quotes&symbols=${encodeURIComponent(
            CRYPTO_QUOTE_SYMBOLS.join(",")
          )}`,
          { credentials: "include" }
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setQuotes(data);
        }
      } finally {
        if (!cancelled) setQuotesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNewsLoading(true);
      try {
        const res = await fetch("/api/alternatives/crypto-news", {
          credentials: "include",
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setNews(data);
        }
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { spot, listed } = useMemo(() => {
    const s: StockQuote[] = [];
    const l: StockQuote[] = [];
    for (const q of quotes) {
      if (q.symbol.endsWith("-USD")) s.push(q);
      else l.push(q);
    }
    s.sort((a, b) => a.symbol.localeCompare(b.symbol));
    l.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return { spot: s, listed: l };
  }, [quotes]);

  const visibleQuotes = useMemo(() => {
    if (tab === "spot") return spot;
    if (tab === "listed") return listed;
    return quotes;
  }, [tab, spot, listed, quotes]);

  const tabs: { id: MarketTab; label: string; count: number; icon: typeof Bitcoin }[] =
    [
      { id: "all", label: "All", count: quotes.length, icon: Bitcoin },
      { id: "spot", label: "Spot pairs", count: spot.length, icon: CircleDollarSign },
      { id: "listed", label: "ETFs & equity", count: listed.length, icon: Building2 },
    ];

  return (
    <div className="space-y-10 min-w-0">
      <PageHeader
        title="Crypto"
        subtitle="Delayed quotes for major tokens and listed exchange / treasury proxies — not investment advice."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Bitcoin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Digital assets</span>
          </div>
        }
      />

      <section aria-label="Crypto quotes" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bitcoin className="h-4 w-4 text-accent" />
              Markets
            </h2>
            <p className="text-xs text-muted mt-1 max-w-xl">
              Card view: filter spot USD pairs vs. listed proxies. Data is delayed.
            </p>
          </div>
          <div
            className="flex w-full max-w-md gap-1 rounded-xl border border-border bg-card/60 p-1 sm:w-auto"
            role="tablist"
            aria-label="Market category"
          >
            {tabs.map(({ id, label, count, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:flex-initial sm:px-4 ${
                  tab === id
                    ? "bg-accent text-black shadow-[0_0_16px_-4px_rgba(201,162,39,0.5)]"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <Icon className="h-3.5 w-3.5 opacity-90" aria-hidden />
                <span className="whitespace-nowrap">{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] tabular-nums ${
                    tab === id ? "bg-black/15 text-black" : "bg-border/60 text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {quotesLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        ) : visibleQuotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-10 text-center text-sm text-muted">
            No quotes in this view. Try another tab or check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleQuotes.map((q) => (
              <QuoteCard key={q.symbol} q={q} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Crypto news" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-accent" />
            Headlines
          </h2>
          <p className="text-xs text-muted mt-1 max-w-3xl leading-relaxed">
            Mixed feed:{" "}
            <span className="text-foreground/90">CoinDesk</span>,{" "}
            <span className="text-foreground/90">Decrypt</span>, and{" "}
            <span className="text-foreground/90">Cointelegraph</span> via RSS, plus
            symbol-linked stories from{" "}
            <span className="text-foreground/90">Yahoo Finance</span>. Each card shows
            the publisher; duplicate URLs are removed.
          </p>
        </div>
        {newsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-sm text-muted">No crypto headlines available right now.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {news.map((article, i) => (
              <NewsCard key={`${article.link}-${i}`} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

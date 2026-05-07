"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Newspaper,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
} from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/PageHeader";
import MarketOverview from "@/components/MarketOverview";
import IndexCharts from "@/components/IndexCharts";
import NewsCard from "@/components/NewsCard";
import type { NewsArticle } from "@/lib/types";

interface SectorData {
  symbol: string;
  name: string;
  color: string;
  price: number;
  dayChange: number;
  dayChangePct: number;
  ytdChangePct: number | null;
}

interface DealArticle extends NewsArticle {
  tag: string;
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function EcmPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [deals, setDeals] = useState<DealArticle[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news", { credentials: "include" });
        if (res.ok) setNews(await res.json());
      } catch {
        // silently fail
      } finally {
        setNewsLoading(false);
      }
    }

    async function fetchSectors() {
      try {
        const res = await fetch("/api/ecm/sectors", {
          credentials: "include",
        });
        if (res.ok) setSectors(await res.json());
      } catch {
        // silently fail
      } finally {
        setSectorsLoading(false);
      }
    }

    async function fetchDeals() {
      try {
        const res = await fetch("/api/ecm/deals", {
          credentials: "include",
        });
        if (res.ok) setDeals(await res.json());
      } catch {
        // silently fail
      } finally {
        setDealsLoading(false);
      }
    }

    fetchNews();
    fetchSectors();
    fetchDeals();
  }, []);

  const sortedByDay = [...sectors].sort(
    (a, b) => b.dayChangePct - a.dayChangePct
  );
  const sortedByYtd = [...sectors]
    .filter((s) => s.ytdChangePct !== null)
    .sort((a, b) => (b.ytdChangePct ?? 0) - (a.ytdChangePct ?? 0));

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Equities"
        subtitle="Market indices, sector performance, deal flow, and equity news."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Capital markets overview</span>
          </div>
        }
      />

      <section aria-label="Equity indices snapshot" className="space-y-0">
        <SectionHeading>Indices</SectionHeading>
        <MarketOverview />
      </section>

      <section aria-label="Index charts" className="space-y-0">
        <IndexCharts />
      </section>

      {/* ── Sector Performance ── */}
      <section aria-label="Sector performance" className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" />
          S&amp;P 500 Sector Performance
        </h2>

        {sectorsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        ) : sectors.length === 0 ? (
          <p className="text-sm text-muted">
            Sector data unavailable right now.
          </p>
        ) : (
          <>
            {/* Bar chart visualization */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex gap-6 text-xs text-muted font-medium">
                <span>Daily Change</span>
              </div>
              <div className="space-y-2">
                {sortedByDay.map((s) => {
                  const maxAbs = Math.max(
                    ...sortedByDay.map((x) => Math.abs(x.dayChangePct)),
                    0.5
                  );
                  const widthPct = Math.min(
                    (Math.abs(s.dayChangePct) / maxAbs) * 100,
                    100
                  );
                  const isPositive = s.dayChangePct >= 0;

                  return (
                    <div key={s.symbol} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-28 shrink-0 truncate">
                        {s.name}
                      </span>
                      <div className="flex-1 flex items-center h-6">
                        <div className="relative w-full h-full flex items-center">
                          <div
                            className={`h-5 rounded ${isPositive ? "bg-green-500/20" : "bg-red-500/20"}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium tabular-nums w-16 text-right flex items-center justify-end gap-0.5 ${
                          isPositive ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {fmtPct(s.dayChangePct)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card grid with YTD */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedByYtd.map((s) => {
                const isPositive = s.dayChangePct >= 0;
                const ytdPositive = (s.ytdChangePct ?? 0) >= 0;
                return (
                  <div
                    key={s.symbol}
                    className="rounded-xl border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-sm font-semibold">{s.name}</span>
                      </div>
                      <span className="text-[10px] text-muted font-mono">
                        {s.symbol}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted">Today</p>
                        <p
                          className={`text-sm font-medium tabular-nums flex items-center gap-0.5 ${isPositive ? "text-green-500" : "text-red-500"}`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {fmtPct(s.dayChangePct)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">YTD</p>
                        <p
                          className={`text-sm font-medium tabular-nums ${ytdPositive ? "text-green-500" : "text-red-500"}`}
                        >
                          {s.ytdChangePct !== null
                            ? fmtPct(s.ytdChangePct)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ── IPO & M&A Pipeline ── */}
      <section aria-label="IPO and M&A pipeline" className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Landmark className="h-5 w-5 text-accent" />
          IPO &amp; M&amp;A Pipeline
        </h2>
        <p className="text-xs text-muted -mt-2">
          Recent listings, SPAC activity, and announced mega-deals.
        </p>

        {dealsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <p className="text-sm text-muted">
            No deal headlines available right now.
          </p>
        ) : (
          <>
            {/* Tag filter pills */}
            <DealFeed deals={deals} />
          </>
        )}
      </section>

      {/* ── Market News ── */}
      <section aria-label="Market news" className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-accent" />
          Market News
        </h2>
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
          <p className="text-sm text-muted">
            No articles available right now.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {news.map((article, i) => (
              <NewsCard key={i} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Deal feed sub-component with tag filtering ── */

function DealFeed({ deals }: { deals: DealArticle[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = [...new Set(deals.map((d) => d.tag))];
  const filtered = activeTag
    ? deals.filter((d) => d.tag === activeTag)
    : deals;

  const tagColors: Record<string, string> = {
    IPO: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    "M&A": "bg-purple-500/10 text-purple-500 border-purple-500/30",
    SPAC: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            activeTag === null
              ? "bg-accent/15 text-accent border-accent/30"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeTag === tag
                ? tagColors[tag] || "bg-accent/15 text-accent border-accent/30"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((article, i) => (
          <div key={i} className="relative">
            <span
              className={`absolute top-3 right-3 z-10 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                tagColors[article.tag] || "bg-accent/10 text-accent border-accent/30"
              }`}
            >
              {article.tag}
            </span>
            <NewsCard article={article} />
          </div>
        ))}
      </div>
    </div>
  );
}

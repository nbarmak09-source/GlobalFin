"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Newspaper,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Building2,
  RefreshCw,
} from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/PageHeader";
import MarketOverview from "@/components/MarketOverview";
import IndexCharts from "@/components/IndexCharts";
import NewsCard from "@/components/NewsCard";
import EarningsCalendar from "@/components/equities/EarningsCalendar";
import type { NewsArticle } from "@/lib/types";

export type EquitiesView =
  | "overview"
  | "indices"
  | "sectors"
  | "deal-flow"
  | "earnings"
  | "news";

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

const VIEW_META: Record<
  EquitiesView,
  { title: string; subtitle: string }
> = {
  overview: {
    title: "Equities",
    subtitle:
      "Market indices, sector performance, deal flow, and equity news.",
  },
  indices: {
    title: "Indices",
    subtitle: "Major cash and futures index levels with historical charts.",
  },
  sectors: {
    title: "Sector performance",
    subtitle: "S&P 500 sector ETFs — daily moves and YTD leaders.",
  },
  "deal-flow": {
    title: "Deal flow",
    subtitle: "IPO, M&A, and SPAC headlines from the ECM feed.",
  },
  earnings: {
    title: "Earnings Calendar",
    subtitle: "Market-wide earnings schedule sorted by market cap.",
  },
  news: {
    title: "Market news",
    subtitle: "Headlines from the global equity news feed.",
  },
};

export default function EquitiesDashboard({
  view = "overview",
}: {
  view?: EquitiesView;
}) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [deals, setDeals] = useState<DealArticle[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  const loadNews = view === "overview" || view === "news";
  const loadSectors = view === "overview" || view === "sectors";
  const loadDeals = view === "overview" || view === "deal-flow";

  const refetchDeals = useCallback(async () => {
    setDealsLoading(true);
    try {
      const res = await fetch("/api/ecm/deals", {
        credentials: "include",
      });
      if (res.ok) setDeals(await res.json());
      else setDeals([]);
    } catch {
      setDeals([]);
    } finally {
      setDealsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news", { credentials: "include" });
        if (res.ok) setNews(await res.json());
      } catch {
        /* ignore */
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
        /* ignore */
      } finally {
        setSectorsLoading(false);
      }
    }

    if (loadNews) fetchNews();
    else setNewsLoading(false);

    if (loadSectors) fetchSectors();
    else setSectorsLoading(false);

    if (loadDeals) void refetchDeals();
    else setDealsLoading(false);
  }, [loadNews, loadSectors, loadDeals, refetchDeals]);

  const sortedByDay = [...sectors].sort(
    (a, b) => b.dayChangePct - a.dayChangePct
  );
  const sortedByYtd = [...sectors]
    .filter((s) => s.ytdChangePct !== null)
    .sort((a, b) => (b.ytdChangePct ?? 0) - (a.ytdChangePct ?? 0));

  const meta = VIEW_META[view];

  const showIndices = view === "overview" || view === "indices";
  const showSectors = view === "overview" || view === "sectors";
  const showDeals = view === "overview" || view === "deal-flow";
  const showNews = view === "overview" || view === "news";
  const showEarnings = view === "earnings";

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        action={
          <span className="badge badge-gold">
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">GlobalFin</span>
          </span>
        }
      />

      {showIndices && (
        <>
          <section aria-label="Equity indices snapshot" className="space-y-0">
            <SectionHeading>Indices</SectionHeading>
            <MarketOverview />
          </section>

          <section aria-label="Index charts" className="space-y-0">
            <IndexCharts />
          </section>
        </>
      )}

          {showSectors && (
        <section aria-label="Sector performance" className="space-y-4">
          <h2
            className="text-heading flex items-center gap-2"
            style={{ fontSize: "1.1rem", color: "var(--color-text)" }}
          >
            <BarChart3 className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            S&amp;P 500 Sector Performance
          </h2>

          {sectorsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : sectors.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Sector data unavailable right now.
            </p>
          ) : (
            <>
              <div className="card p-5 space-y-4">
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

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedByYtd.map((s) => {
                  const isPositive = s.dayChangePct >= 0;
                  const ytdPositive = (s.ytdChangePct ?? 0) >= 0;
                  return (
                    <div key={s.symbol} className="card-solid hover-lift p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                            {s.name}
                          </span>
                        </div>
                        <span className="text-mono" style={{ fontSize: 10, color: "var(--color-muted)" }}>
                          {s.symbol}
                        </span>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-label" style={{ marginBottom: 2 }}>Today</p>
                          <p
                            className={`text-sm font-medium tabular-nums flex items-center gap-0.5 ${isPositive ? "stat-positive" : "stat-negative"}`}
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
                          <p className="text-label" style={{ marginBottom: 2 }}>YTD</p>
                          <p className={`text-sm font-medium tabular-nums ${ytdPositive ? "stat-positive" : "stat-negative"}`}>
                            {s.ytdChangePct !== null ? fmtPct(s.ytdChangePct) : "—"}
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
      )}

      {showDeals && (
        <section aria-label="IPO and M&A pipeline" className="space-y-4">
          <h2
            className="text-heading flex items-center gap-2"
            style={{ fontSize: "1.1rem", color: "var(--color-text)" }}
          >
            <Landmark className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            IPO &amp; M&amp;A Pipeline
          </h2>
          <p className="-mt-2" style={{ fontSize: 12, color: "var(--color-muted)" }}>
            Recent listings, SPAC activity, and announced mega-deals.
          </p>

          {dealsLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-xl bg-card border border-border p-3">
                <Building2 className="h-6 w-6 text-muted" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No deal headlines right now
                </p>
                <p className="text-xs text-muted mt-1 max-w-xs">
                  IPO, M&A, and SPAC activity from the ECM feed. Check back
                  during market hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refetchDeals()}
                className="text-xs text-accent flex items-center gap-1 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Refresh
              </button>
            </div>
          ) : (
            <DealFeed deals={deals} />
          )}
        </section>
      )}

      {showEarnings && (
        <section aria-label="Earnings calendar">
          <EarningsCalendar />
        </section>
      )}

      {showNews && (
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
            <p className="text-sm text-muted">No articles available right now.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {news.map((article, i) => (
                <NewsCard key={i} article={article} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

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
      <div className="flex gap-2 flex-wrap">
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

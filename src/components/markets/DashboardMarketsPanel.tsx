"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  TrendingDown,
  ExternalLink,
  Clock,
  ChevronRight,
} from "lucide-react";
import { SkeletonCard, SkeletonText } from "@/components/Skeleton";
import SectorPerformance from "@/components/markets/SectorPerformance";
import MarketValuations from "@/components/markets/MarketValuations";
import type { NewsArticle } from "@/lib/types";
import { allowOptimizeNewsThumbnail } from "@/lib/newsThumbnailHosts";

interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  price: number;
  dayChangePct: number;
  pe: number;
  forwardPE: number;
  dividendYield: number;
  revenueGrowth: number;
  priceToBook: number;
}

interface UpgradeEntry {
  symbol: string;
  date: string;
  firm: string;
  toGrade: string;
  fromGrade: string;
  action: string;
}

function actionBadge(action: string): { label: string; cls: string } {
  const a = action.toLowerCase();
  if (a === "upgrade" || a === "up")
    return { label: "Upgrade", cls: "bg-green/15 text-green" };
  if (a === "downgrade" || a === "down")
    return { label: "Downgrade", cls: "bg-red/15 text-red" };
  if (a === "init" || a === "initiated")
    return { label: "Initiated", cls: "bg-accent/15 text-accent" };
  return { label: action || "Reiterated", cls: "bg-card-hover text-muted" };
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function DashboardMarketsPanel() {
  const [screenerData, setScreenerData] = useState<ScreenerResult[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeEntry[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, uRes, nRes] = await Promise.allSettled([
      fetch("/api/screener", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch("/api/research/upgrades").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/news").then((r) => (r.ok ? r.json() : [])),
    ]);

    setScreenerData(sRes.status === "fulfilled" ? sRes.value : []);
    setUpgrades(
      uRes.status === "fulfilled"
        ? (uRes.value as UpgradeEntry[]).slice(0, 15)
        : []
    );
    setNews(
      nRes.status === "fulfilled"
        ? (nRes.value as NewsArticle[]).slice(0, 10)
        : []
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-8 sm:space-y-10 min-w-0">
        <div className="space-y-2 max-w-2xl">
          <SkeletonText width="w-full" />
          <SkeletonText width="w-5/6" />
        </div>
        <section>
          <SkeletonText width="w-40 mb-3" />
          <SkeletonCard rows={4} />
        </section>
        <section>
          <div className="flex items-center justify-between mb-3 gap-4">
            <SkeletonText width="w-24" />
            <SkeletonText width="w-28" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} rows={4} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 min-w-0">
      <p className="text-sm text-muted max-w-2xl">
        Sector performance, aggregate valuations, analyst activity, and market
        news — from the same screener universe as Research Discover.
      </p>

      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Market snapshot
        </h2>
        <MarketValuations data={screenerData} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Sectors
          </h2>
          <Link
            href="/screener"
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            Full screener
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <SectorPerformance data={screenerData} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {upgrades.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-accent" />
              Recent analyst actions
            </h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="divide-y divide-border/50">
                {upgrades.map((u, i) => {
                  const badge = actionBadge(u.action);
                  return (
                    <div
                      key={`${u.symbol}-${u.date}-${i}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-card-hover/50 transition-colors"
                    >
                      <span className="text-[10px] text-muted w-12 shrink-0">
                        {new Date(u.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Link
                        href={`/stocks?symbol=${encodeURIComponent(u.symbol)}`}
                        className="text-sm font-semibold text-accent hover:underline w-14 shrink-0"
                      >
                        {u.symbol}
                      </Link>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-muted truncate flex-1">
                        {u.firm}
                      </span>
                      <span className="text-xs text-muted shrink-0">
                        {u.fromGrade ? `${u.fromGrade} →` : ""} {u.toGrade}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {news.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-accent" />
              Market news
            </h2>
            <div className="space-y-2">
              {news.map((article, i) => (
                <a
                  key={i}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-colors"
                >
                  {article.thumbnail && (
                    <div className="relative hidden sm:block h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-border">
                      <Image
                        src={article.thumbnail}
                        alt=""
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized={!allowOptimizeNewsThumbnail(article.thumbnail)}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-1">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span className="font-medium">{article.source}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(article.publishedAt)}
                      </span>
                      <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  DollarSign,
  Shield,
  Gem,
  Crown,
  Zap,
  ExternalLink,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import PowerTierBadge from "@/components/research/PowerTierBadge";
import { getTierBySymbol } from "@/lib/tiers";

interface ScreenerResult {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  dayChangePct: number;
  pe: number;
  dividendYield: number;
  beta: number;
  revenueGrowth: number;
  recommendationMean: number;
  recommendationKey: string;
}

interface UpgradeEntry {
  symbol: string;
  date: string;
  firm: string;
  toGrade: string;
  fromGrade: string;
  action: string;
}

const IDEA_CARDS = [
  {
    id: "undervalued",
    title: "Undervalued (Low P/E)",
    desc: "Stocks trading at lower P/E multiples relative to the broad market.",
    icon: Gem,
    filters: "maxPE=15",
    color: "text-green",
    bg: "bg-green/10",
  },
  {
    id: "growth-tech",
    title: "High revenue growth",
    desc: "Names with strong top-line growth (any sector).",
    icon: Zap,
    filters: "minRevenueGrowth=10",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    id: "dividends",
    title: "Dividend Powerhouses (3%+)",
    desc: "Consistent payers with yields above 3%.",
    icon: DollarSign,
    filters: "minDividendYield=3",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    id: "balance-sheet",
    title: "Solid Balance Sheets",
    desc: "Low leverage and strong liquidity ratios.",
    icon: Shield,
    filters: "maxDebtToEquity=80&minCurrentRatio=1.5",
    color: "text-green",
    bg: "bg-green/10",
  },
  {
    id: "mega-cap",
    title: "Mega Caps",
    desc: "Largest companies by market capitalisation.",
    icon: Crown,
    filters: "minMarketCap=200000000000",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    id: "defensive",
    title: "Low Beta / Defensive",
    desc: "Less volatile names for turbulent markets.",
    icon: Shield,
    filters: "maxBeta=0.8",
    color: "text-green",
    bg: "bg-green/10",
  },
];

function recBadge(key: string): { label: string; cls: string } {
  const k = key.toLowerCase().replace(/_/g, "");
  if (k === "strongbuy") return { label: "Strong Buy", cls: "bg-green/20 text-green" };
  if (k === "buy") return { label: "Buy", cls: "bg-green/15 text-green" };
  if (k === "hold") return { label: "Hold", cls: "bg-accent/15 text-accent" };
  if (k === "sell" || k === "underperform") return { label: "Sell", cls: "bg-red/15 text-red" };
  if (k === "strongsell") return { label: "Strong Sell", cls: "bg-red/20 text-red" };
  return { label: key || "—", cls: "bg-card-hover text-muted" };
}

function actionBadge(action: string): { label: string; cls: string } {
  const a = action.toLowerCase();
  if (a === "upgrade" || a === "up") return { label: "Upgrade", cls: "bg-green/15 text-green" };
  if (a === "downgrade" || a === "down") return { label: "Downgrade", cls: "bg-red/15 text-red" };
  if (a === "init" || a === "initiated") return { label: "Initiated", cls: "bg-accent/15 text-accent" };
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

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export default function DiscoverTab() {
  const [topPicks, setTopPicks] = useState<ScreenerResult[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeEntry[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [screenerRes, upgradesRes, newsRes] = await Promise.allSettled([
      fetch("/api/screener", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch("/api/research/upgrades").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/news").then((r) => (r.ok ? r.json() : [])),
    ]);

    const screenerData: ScreenerResult[] =
      screenerRes.status === "fulfilled" ? screenerRes.value : [];
    const sorted = [...screenerData]
      .filter((s) => s.recommendationMean > 0)
      .sort((a, b) => a.recommendationMean - b.recommendationMean);
    setTopPicks(sorted.slice(0, 12));

    setUpgrades(
      upgradesRes.status === "fulfilled"
        ? (upgradesRes.value as UpgradeEntry[]).slice(0, 20)
        : []
    );
    setNews(
      newsRes.status === "fulfilled"
        ? (newsRes.value as NewsArticle[]).slice(0, 8)
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
      <div className="flex items-center justify-center py-24 gap-2 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading ideas...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Investing idea cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-serif font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Investing ideas
            </h2>
            <p className="text-xs text-muted mt-1">
              Curated screens based on fundamental criteria. Click to explore.
            </p>
          </div>
          <Link
            href="/screener"
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            Build your own
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {IDEA_CARDS.map((card) => (
            <Link
              key={card.id}
              href={`/screener?preset=${card.id}`}
              className="group rounded-2xl border border-border bg-card p-5 hover:bg-card-hover transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-xl p-2.5 ${card.bg}`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top analyst picks */}
      {topPicks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Top analyst picks
              </h2>
              <p className="text-xs text-muted mt-1">
                Sorted by analyst consensus (strongest buy first). From Yahoo
                Finance <code className="text-[11px]">financialData</code>.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {topPicks.map((s) => {
              const badge = recBadge(s.recommendationKey);
              const tier = getTierBySymbol(s.symbol);
              return (
                <Link
                  key={s.symbol}
                  href={`/stocks?symbol=${encodeURIComponent(s.symbol)}`}
                  className="group rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-accent text-sm group-hover:underline truncate">
                        {s.symbol}
                      </p>
                      <p className="text-xs text-muted truncate">{s.name}</p>
                      {tier && (
                        <div className="mt-1.5">
                          <PowerTierBadge tier={tier.tier} />
                        </div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-medium">
                      ${s.price.toFixed(2)}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 font-mono ${
                        s.dayChangePct >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {s.dayChangePct >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {s.dayChangePct >= 0 ? "+" : ""}
                      {s.dayChangePct.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted mt-1 font-mono">
                    {fmtCap(s.marketCap)}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent upgrades/downgrades */}
      {upgrades.length > 0 && (
        <section>
          <h2 className="text-lg font-serif font-semibold flex items-center gap-2 mb-1">
            <TrendingDown className="h-5 w-5 text-accent" />
            Recent upgrades &amp; downgrades
          </h2>
          <p className="text-xs text-muted mb-4">
            Last 60 days from Yahoo{" "}
            <code className="text-[11px]">upgradeDowngradeHistory</code>.
          </p>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[580px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Symbol</th>
                    <th className="text-left py-3 px-4">Firm</th>
                    <th className="text-left py-3 px-4">Action</th>
                    <th className="text-left py-3 px-4">From</th>
                    <th className="text-left py-3 px-4">To</th>
                  </tr>
                </thead>
                <tbody>
                  {upgrades.map((u, i) => {
                    const badge = actionBadge(u.action);
                    return (
                      <tr
                        key={`${u.symbol}-${u.date}-${i}`}
                        className="border-b border-border/50 hover:bg-card-hover/50 transition-colors"
                      >
                        <td className="py-2.5 px-4 text-xs text-muted whitespace-nowrap">
                          {new Date(u.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 px-4">
                          <Link
                            href={`/stocks?symbol=${encodeURIComponent(u.symbol)}`}
                            className="font-semibold text-accent hover:underline"
                          >
                            {u.symbol}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted truncate max-w-[180px]">
                          {u.firm}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs">{u.fromGrade || "—"}</td>
                        <td className="py-2.5 px-4 text-xs font-medium">{u.toGrade || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Market news */}
      {news.length > 0 && (
        <section>
          <h2 className="text-lg font-serif font-semibold flex items-center gap-2 mb-4">
            <ExternalLink className="h-5 w-5 text-accent" />
            Market news
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {news.map((article, i) => (
              <a
                key={i}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-colors"
              >
                <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="font-medium">{article.source}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(article.publishedAt)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, ChevronDown, BarChart3 } from "lucide-react";
import type { QuoteSummaryData, NewsArticle } from "@/lib/types";

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

interface PositionDetailPanelProps {
  symbol: string;
  onClose?: () => void;
}

export default function PositionDetailPanel({ symbol, onClose }: PositionDetailPanelProps) {
  const [summary, setSummary] = useState<QuoteSummaryData | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      fetch(`/api/stocks?action=summary&symbol=${encodeURIComponent(symbol)}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/stocks?action=news&symbol=${encodeURIComponent(symbol)}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([sum, nws]) => {
        setSummary(sum);
        setNews(nws || []);
      })
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="px-4 py-6 flex items-center justify-center gap-2 text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading details...
      </div>
    );
  }

  const metrics = summary
    ? (() => {
        const base = [
          { label: "Market Cap", value: formatMarketCap(summary.marketCap) },
          { label: "P/E (TTM)", value: summary.trailingPE?.toFixed(2) ?? "—" },
          { label: "Forward P/E", value: summary.forwardPE?.toFixed(2) ?? "—" },
          { label: "P/B", value: summary.priceToBook?.toFixed(2) ?? "—" },
          { label: "P/S", value: summary.priceToSalesTrailing12Months?.toFixed(2) ?? "—" },
          { label: "Beta", value: summary.beta?.toFixed(2) ?? "—" },
          { label: "Div Yield", value: summary.dividendYield ? `${(summary.dividendYield * 100).toFixed(2)}%` : "—" },
          { label: "52W Range", value: summary.fiftyTwoWeekLow && summary.fiftyTwoWeekHigh ? `$${summary.fiftyTwoWeekLow.toFixed(2)} - $${summary.fiftyTwoWeekHigh.toFixed(2)}` : "—" },
        ];
        if (summary.preMarketPrice != null && summary.preMarketPrice > 0) {
          const up = (summary.preMarketChange ?? 0) >= 0;
          base.push({
            label: "Pre-market",
            value: `$${summary.preMarketPrice.toFixed(2)} · ${up ? "+" : ""}${(summary.preMarketChange ?? 0).toFixed(2)} (${up ? "+" : ""}${(summary.preMarketChangePercent ?? 0).toFixed(2)}%)`,
          });
        }
        if (summary.postMarketPrice != null && summary.postMarketPrice > 0) {
          const up = (summary.postMarketChange ?? 0) >= 0;
          base.push({
            label: "After hours",
            value: `$${summary.postMarketPrice.toFixed(2)} · ${up ? "+" : ""}${(summary.postMarketChange ?? 0).toFixed(2)} (${up ? "+" : ""}${(summary.postMarketChangePercent ?? 0).toFixed(2)}%)`,
          });
        }
        return base;
      })()
    : [];

  const analystRating = summary?.recommendationKey
    ? String(summary.recommendationKey).replace(/([A-Z])/g, " $1").trim()
    : null;
  const targetPrice = summary?.targetMeanPrice;

  return (
    <div className="px-4 py-4 border-t border-border bg-background/50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Key metrics */}
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Key Metrics
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {metrics.map((m) => (
              <div key={m.label} className="flex justify-between">
                <span className="text-muted">{m.label}</span>
                <span className="font-mono font-medium">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overview + Analyst */}
        <div className="space-y-4">
          {summary?.longBusinessSummary && (
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Overview
              </h4>
              <p className="text-sm text-foreground/90 line-clamp-4 leading-relaxed">
                {summary.longBusinessSummary}
              </p>
            </div>
          )}
          {(analystRating || targetPrice) && (
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Analyst
              </h4>
              <div className="flex flex-wrap gap-3 text-sm">
                {analystRating && (
                  <span className="px-2 py-1 rounded bg-accent/15 text-accent font-medium capitalize">
                    {analystRating}
                  </span>
                )}
                {targetPrice != null && (
                  <span className="font-mono">
                    Target: ${targetPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* News */}
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Recent News
          </h4>
          {news.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {news.map((article, i) => (
                <a
                  key={i}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-foreground hover:text-accent transition-colors line-clamp-2 group"
                >
                  {article.title}
                  <ExternalLink className="inline h-3 w-3 ml-1 opacity-0 group-hover:opacity-100" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No recent news</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        {onClose ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3 w-3 rotate-180" />
            Collapse
          </button>
        ) : (
          <span />
        )}
        <Link
          href={`/stocks?symbol=${encodeURIComponent(symbol)}`}
          className="text-xs text-accent hover:underline"
        >
          View full analysis →
        </Link>
      </div>
    </div>
  );
}

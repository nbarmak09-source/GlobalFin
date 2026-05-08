"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import NewsCard from "@/components/NewsCard";
import type { MacroNewsTopic } from "@/lib/macroNews";
import type { NewsArticle } from "@/lib/types";

const TOPIC_BLURB: Record<MacroNewsTopic, string> = {
  overview:
    "St. Louis Fed (FRED Blog), New York Fed (Liberty Street), World Bank blogs, MarketWatch, BBC, and The Guardian — keyword‑filtered for broad macro. No Yahoo Finance.",
  inflation:
    "Stories matched to prices, CPI/PCE, and inflation dynamics from the same diversified feed mix.",
  employment:
    "U.S. jobs, payrolls, layoffs, and labor-market data — plus major hiring tied to new plants, factories, or corporate expansions. Fed blogs are treated as U.S.-focused unless clearly about other regions. World Bank posts only appear when the headline explicitly ties to the United States.",
  gdp: "Growth, recessions, output, and development — including World Bank plus business press.",
  rates: "Yields, the Fed, and rate policy from research blogs and global market coverage.",
  currency: "FX and dollar headlines from the aggregated feeds (keyword‑filtered).",
  commodities: "Energy, metals, and commodity themes where headlines match; extra loose matching if the niche feed is thin.",
};

interface MacroNewsSectionProps {
  topic: MacroNewsTopic;
  /** Optional override for the card heading (default: “Related coverage”). */
  heading?: string;
}

export default function MacroNewsSection({
  topic,
  heading = "Related coverage",
}: MacroNewsSectionProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/macro-news?topic=${encodeURIComponent(topic)}`,
          { credentials: "include" }
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setArticles(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topic]);

  return (
    <section aria-label="Macro news" className="space-y-3 min-w-0">
      <div
        className="flex items-center gap-2 mb-1"
        style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}
      >
        <Newspaper className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
          {heading}
        </span>
      </div>
      <p className="text-[11px] text-muted leading-relaxed max-w-3xl">
        {TOPIC_BLURB[topic]}
      </p>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-muted">
          No articles matched this topic right now. Feeds may be slow or temporarily unavailable.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {articles.map((article, i) => (
            <NewsCard key={`${article.link}-${i}`} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

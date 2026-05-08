"use client";

import Image from "next/image";
import { ExternalLink, Clock } from "lucide-react";
import type { NewsArticle } from "@/lib/types";
import { allowOptimizeNewsThumbnail } from "@/lib/newsThumbnailHosts";

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

export default function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-xl bg-card border border-border p-4 hover:bg-card-hover transition-all duration-200 cursor-pointer shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25"
    >
      {article.thumbnail && (
        <div className="relative hidden sm:block h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-border">
          <Image
            src={article.thumbnail}
            alt=""
            width={96}
            height={96}
            className="h-full w-full object-cover"
            unoptimized={!allowOptimizeNewsThumbnail(article.thumbnail)}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-accent transition-colors duration-200 line-clamp-2 mb-2">
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
  );
}

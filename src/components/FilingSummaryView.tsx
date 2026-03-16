"use client";

import type { FilingSummary } from "@/lib/filingSummary";

export default function FilingSummaryView({ summary }: { summary: FilingSummary }) {
  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted mb-1">
          {summary.meta.symbol && <span className="font-mono mr-2">{summary.meta.symbol}</span>}
          <span>{summary.meta.companyName}</span>
        </div>
        <h2 className="text-lg font-semibold">
          {summary.meta.filingType} Summary
          {summary.meta.period && (
            <span className="text-sm text-muted font-normal ml-2">
              — {summary.meta.period}
            </span>
          )}
        </h2>
      </header>
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">Summary</h3>
        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
          {summary.highLevelSummary}
        </div>
      </section>
    </div>
  );
}


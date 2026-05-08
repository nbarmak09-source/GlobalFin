"use client";

import Link from "next/link";
import { Briefcase, Landmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function AlternativesPrivateEquityPage() {
  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Private equity"
        subtitle="Listed markets are a thin slice of global financing — use ECM deal flow and portfolio tools as public-market analogs."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PE lens</span>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm text-muted leading-relaxed">
        <p>
          This workspace focuses on <strong className="text-foreground">liquid</strong> proxies:
          LBO-driven sectors, sponsor-backed IPOs, and credit spreads. For live IPO / M&amp;A headlines,
          use the equities deal-flow feed.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link href="/equities/deal-flow" className="text-accent hover:underline">
              Deal flow — IPOs, M&amp;A, SPACs
            </Link>
          </li>
          <li>
            <Link href="/fixed-income/spreads" className="text-accent hover:underline">
              Credit spreads — financing conditions
            </Link>
          </li>
          <li>
            <Link href="/research" className="text-accent hover:underline">
              Equity research — fundamental ideas
            </Link>
          </li>
        </ul>
      </div>

      <section className="rounded-xl border border-dashed border-border bg-card/50 p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <Landmark className="h-4 w-4 text-accent" />
          Coming later
        </h2>
        <p className="text-xs text-muted">
          Fund performance schedules, cap-table math, and secondaries pricing require private data
          feeds — not wired in this build.
        </p>
      </section>
    </div>
  );
}

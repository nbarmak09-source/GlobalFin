"use client";

import { Activity, Globe } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import MacroIndicators from "@/components/MacroIndicators";
import MacroCharts from "@/components/MacroCharts";
import GlobalMacroPanel from "@/components/GlobalMacroPanel";
import Treasury10y2yChart from "@/components/Treasury10y2yChart";
import MacroNewsSection from "@/components/macro/MacroNewsSection";

export default function MacroOverviewPage() {
  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Macro overview"
        subtitle="US FRED indicators, yield context, and World Bank cross-country comparisons."
        action={
          <div
            className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0"
            aria-hidden
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Live macro</span>
          </div>
        }
      />

      <section aria-label="Macro indicators">
        <div
          className="flex items-center gap-2 mb-2"
          style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}
        >
          <Activity className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
            Key indicators
          </span>
        </div>
        <MacroIndicators />
        <p className="mt-3 text-[11px] text-muted">
          Macro data sourced from{" "}
          <a
            href="https://fred.stlouisfed.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-accent transition-colors duration-200"
          >
            FRED®
          </a>{" "}
          (Federal Reserve Bank of St. Louis)
        </p>
        <div className="mt-3">
          <MacroCharts />
        </div>
        <div className="mt-4">
          <Treasury10y2yChart />
        </div>
      </section>

      <section aria-label="Global macro">
        <div
          className="flex items-center gap-2 mt-2 mb-2"
          style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
            Global macro
          </span>
        </div>
        <GlobalMacroPanel />
      </section>

      <MacroNewsSection topic="overview" />
    </div>
  );
}

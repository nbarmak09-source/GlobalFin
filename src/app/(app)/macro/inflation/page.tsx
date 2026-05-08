"use client";

import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import MacroIndicators from "@/components/MacroIndicators";
import MacroCharts, { type MacroChartSeriesKey } from "@/components/MacroCharts";
import MacroNewsSection from "@/components/macro/MacroNewsSection";

const INFLATION_CHARTS = ["cpiYoY", "m2"] as const satisfies readonly MacroChartSeriesKey[];

export default function MacroInflationPage() {
  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Inflation"
        subtitle="Headline CPI momentum and broad money growth — context for real rates and multiples."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prices</span>
          </div>
        }
      />

      <section aria-label="Inflation indicators">
        <MacroIndicators />
        <p className="mt-3 text-[11px] text-muted">
          CPI series from{" "}
          <a
            href="https://fred.stlouisfed.org/series/CPIAUCSL"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-accent transition-colors duration-200"
          >
            FRED: CPIAUCSL
          </a>
          .
        </p>
      </section>

      <section aria-label="Inflation history charts">
        <MacroCharts
          seriesKeys={INFLATION_CHARTS}
          sectionLabel="CPI YoY & M2 (FRED)"
        />
      </section>

      <MacroNewsSection topic="inflation" />
    </div>
  );
}

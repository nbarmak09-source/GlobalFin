"use client";

import { Globe, Factory } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import GlobalMacroPanel from "@/components/GlobalMacroPanel";
import MacroCharts, { type MacroChartSeriesKey } from "@/components/MacroCharts";
import MacroNewsSection from "@/components/macro/MacroNewsSection";

const ACTIVITY_CHARTS = [
  "industrialProduction",
  "ismManufacturing",
] as const satisfies readonly MacroChartSeriesKey[];

export default function MacroGdpPage() {
  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="GDP & growth"
        subtitle="World Bank GDP growth by economy plus high-frequency US activity from FRED."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Growth</span>
          </div>
        }
      />

      <section aria-label="Global GDP growth">
        <div
          className="flex items-center gap-2 mb-2"
          style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
            World Bank — GDP, inflation, unemployment
          </span>
        </div>
        <GlobalMacroPanel />
      </section>

      <section aria-label="US activity">
        <div
          className="flex items-center gap-2 mt-2 mb-2"
          style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}
        >
          <Factory className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
            US activity & surveys
          </span>
        </div>
        <MacroCharts
          seriesKeys={ACTIVITY_CHARTS}
          sectionLabel="Industrial production & manufacturing PMI"
        />
      </section>

      <MacroNewsSection topic="gdp" />
    </div>
  );
}

"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import MacroCharts, { type MacroChartSeriesKey } from "@/components/MacroCharts";
import MacroNewsSection from "@/components/macro/MacroNewsSection";

const LABOR_CHARTS = [
  "unemployment",
  "consumerSentiment",
] as const satisfies readonly MacroChartSeriesKey[];

export default function MacroEmploymentPage() {
  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Employment"
        subtitle="Unemployment rate and household sentiment — labor slack vs. confidence."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Labor</span>
          </div>
        }
      />

      <section aria-label="Labor market charts">
        <MacroCharts
          seriesKeys={LABOR_CHARTS}
          sectionLabel="Unemployment & consumer sentiment (FRED)"
        />
      </section>

      <MacroNewsSection topic="employment" />
    </div>
  );
}

"use client";

import { Landmark } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import Treasury10y2yChart from "@/components/Treasury10y2yChart";
import MacroCharts, { type MacroChartSeriesKey } from "@/components/MacroCharts";
import MacroNewsSection from "@/components/macro/MacroNewsSection";

const RATES_CHARTS = ["fedFunds", "recessionProb"] as const satisfies readonly MacroChartSeriesKey[];

export default function MacroInterestRatesPage() {
  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Interest rates"
        subtitle="Policy rate path, recession probability from FRED, and the Treasury curve."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Landmark className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rates</span>
          </div>
        }
      />

      <section aria-label="Treasury yield curve">
        <YieldCurveMonitor />
      </section>

      <section aria-label="10Y and 2Y Treasury history">
        <Treasury10y2yChart />
      </section>

      <section aria-label="Fed funds and cycle risk">
        <MacroCharts
          seriesKeys={RATES_CHARTS}
          sectionLabel="Policy & cycle risk (FRED)"
        />
      </section>

      <MacroNewsSection topic="rates" />
    </div>
  );
}

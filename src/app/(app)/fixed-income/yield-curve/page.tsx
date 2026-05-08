"use client";

import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import Treasury10y2yChart from "@/components/Treasury10y2yChart";

export default function FixedIncomeYieldCurvePage() {
  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Yield curve"
        subtitle="On-the-run Treasury curve plus 10Y–2Y history."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <LineChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Curve</span>
          </div>
        }
      />
      <section aria-label="Yield curve">
        <YieldCurveMonitor />
      </section>
      <section aria-label="10Y and 2Y Treasury history">
        <Treasury10y2yChart />
      </section>
    </div>
  );
}

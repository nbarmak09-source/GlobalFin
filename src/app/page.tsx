"use client";

import MarketOverview from "@/components/MarketOverview";
import VisualCapitalistCard from "@/components/VisualCapitalistCard";
import CurrenciesPanel from "@/components/CurrenciesPanel";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import MacroIndicators from "@/components/MacroIndicators";
import MacroCharts from "@/components/MacroCharts";
import { ImageIcon, DollarSign, Activity } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <div>
        <div className="mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-bold font-serif mb-1">Market Overview</h1>
          <p className="text-sm text-muted">
            Major indices and market performance
          </p>
        </div>
        <section className="mb-4 sm:mb-6" aria-label="Macro indicators">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Macro Indicators
          </h2>
          <MacroIndicators />
          <div className="mt-4">
            <MacroCharts />
          </div>
        </section>
        <MarketOverview />
        <section className="mt-4 sm:mt-6" aria-label="Currencies">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            Currencies
          </h2>
          <CurrenciesPanel />
        </section>
        <section className="mt-4 sm:mt-6" aria-label="Yield curve">
          <YieldCurveMonitor />
        </section>
        <section className="mt-4 sm:mt-6" aria-label="Visual Capitalist insight">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-accent" />
            Visual Capitalist insight
          </h2>
          <VisualCapitalistCard />
        </section>
      </div>
    </div>
  );
}

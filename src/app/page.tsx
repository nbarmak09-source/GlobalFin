"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MarketOverview from "@/components/MarketOverview";
import VisualCapitalistCard from "@/components/VisualCapitalistCard";
import CurrenciesPanel from "@/components/CurrenciesPanel";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import MacroIndicators from "@/components/MacroIndicators";
import MacroCharts from "@/components/MacroCharts";
import DashboardMarketsPanel from "@/components/markets/DashboardMarketsPanel";
import {
  ImageIcon,
  DollarSign,
  Activity,
  LayoutGrid,
  BarChart3,
  Loader2,
} from "lucide-react";

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "markets" ? "markets" : "overview";

  function setTab(next: "overview" | "markets") {
    if (next === "markets") {
      router.replace("/?tab=markets", { scroll: false });
    } else {
      router.replace("/", { scroll: false });
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif mb-1">
            {tab === "overview" ? "Market Overview" : "Markets"}
          </h1>
          <p className="text-sm text-muted">
            {tab === "overview"
              ? "Major indices, macro data, and market performance"
              : "Sectors, valuations, analyst activity, and headlines"}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "overview"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab("markets")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "markets"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Markets
          </button>
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-6 sm:space-y-8">
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
      ) : (
        <DashboardMarketsPanel />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 gap-2 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading dashboard...
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}

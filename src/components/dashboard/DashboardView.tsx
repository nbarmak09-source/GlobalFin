"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MarketOverview from "@/components/MarketOverview";
import VisualCapitalistCard from "@/components/VisualCapitalistCard";
import CurrenciesPanel from "@/components/CurrenciesPanel";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import MacroIndicators from "@/components/MacroIndicators";
import MacroCharts from "@/components/MacroCharts";
import GlobalMacroPanel from "@/components/GlobalMacroPanel";
import DashboardMarketsPanel from "@/components/markets/DashboardMarketsPanel";
import {
  ImageIcon,
  DollarSign,
  Activity,
  LayoutGrid,
  BarChart3,
  Loader2,
  Globe,
} from "lucide-react";

function SectionHeader({
  icon: Icon,
  label,
  accentColor = "var(--accent)",
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  accentColor?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 mt-6 mb-3"
      style={{ borderLeft: `2px solid ${accentColor}`, paddingLeft: "10px" }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
      <span
        className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted"
      >
        {label}
      </span>
    </div>
  );
}

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
    <div className="space-y-0 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
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
        <div className="flex items-center gap-1 rounded-lg bg-card border border-[rgba(255,255,255,0.12)] p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-[500] rounded-md transition-colors ${
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
            className={`flex items-center gap-2 px-4 py-2 text-sm font-[500] rounded-md transition-colors ${
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
        <div>
          <section aria-label="Macro indicators">
            <SectionHeader icon={Activity} label="Macro Indicators" />
            <MacroIndicators />
            <p className="mt-3 text-[11px] text-[#8b949e]">
              Macro data sourced from{" "}
              <a
                href="https://fred.stlouisfed.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#c9a227] transition-colors"
              >
                FRED®
              </a>{" "}
              (Federal Reserve Bank of St. Louis)
            </p>
            <div className="mt-3">
              <MacroCharts />
            </div>
          </section>

          <section aria-label="Global macro">
            <SectionHeader icon={Globe} label="Global Macro" />
            <GlobalMacroPanel />
          </section>

          <section aria-label="Market indices" className="mt-6">
            <MarketOverview />
          </section>

          <section aria-label="Currencies">
            <SectionHeader icon={DollarSign} label="Currencies" />
            <CurrenciesPanel />
          </section>

          <section aria-label="Yield curve" className="mt-6">
            <YieldCurveMonitor />
          </section>

          <section aria-label="Visual Capitalist insight">
            <SectionHeader icon={ImageIcon} label="Visual Capitalist Insight" />
            <VisualCapitalistCard />
          </section>
        </div>
      ) : (
        <DashboardMarketsPanel />
      )}
    </div>
  );
}

export default function DashboardView() {
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

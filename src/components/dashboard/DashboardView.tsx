"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import MarketOverview from "@/components/MarketOverview";
import VisualCapitalistCard from "@/components/VisualCapitalistCard";
import CurrenciesPanel from "@/components/CurrenciesPanel";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import Treasury10y2yChart from "@/components/Treasury10y2yChart";
import MacroIndicators from "@/components/MacroIndicators";
import MacroCharts from "@/components/MacroCharts";
import GlobalMacroPanel from "@/components/GlobalMacroPanel";
import DashboardMarketsPanel from "@/components/markets/DashboardMarketsPanel";
import { LivePriceDemo } from "@/components/LivePriceDemo";
import { SectionHeading } from "@/components/PageHeader";
import {
  ImageIcon,
  DollarSign,
  Activity,
  LayoutGrid,
  BarChart3,
  Loader2,
  Globe,
  Landmark,
  Sparkles,
  Radio,
} from "lucide-react";

type DashboardTab = "overview" | "rates" | "insights" | "markets";

function parseDashboardTab(param: string | null): DashboardTab {
  if (param === "markets" || param === "rates" || param === "insights") return param;
  return "overview";
}

const TAB_META: Record<DashboardTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Major indices, macro data, and market performance",
  },
  rates: {
    title: "Rates & FX",
    subtitle: "Treasury curve, spreads, and major currencies",
  },
  insights: {
    title: "Insights",
    subtitle: "Charts and long-form market context",
  },
  markets: {
    title: "Markets",
    subtitle: "Sectors, valuations, analyst activity, and headlines",
  },
};

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
      className="flex items-center gap-2 mt-4 mb-2"
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
  const { data: session } = useSession();
  const tab = parseDashboardTab(searchParams.get("tab"));

  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function setTab(next: DashboardTab) {
    if (next === "overview") {
      router.replace("/", { scroll: false });
    } else {
      router.replace(`/?tab=${next}`, { scroll: false });
    }
  }

  const meta = TAB_META[tab];

  const dashboardTabs: { id: DashboardTab; label: string; icon: typeof LayoutGrid }[] = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "rates", label: "Rates & FX", icon: Landmark },
    { id: "insights", label: "Insights", icon: Sparkles },
    { id: "markets", label: "Markets", icon: BarChart3 },
  ];

  return (
    <div className="space-y-0 min-w-0">
      <div className="flex flex-col gap-3 mb-4">
        <div>
          {firstName && (
            <p className="text-xs text-muted mb-1">
              {getGreeting()}, {firstName}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-bold font-serif mb-1">{meta.title}</h1>
          <p className="text-sm text-muted">{meta.subtitle}</p>
        </div>
        <div
          className="flex w-full max-w-full gap-1 rounded-xl bg-card border border-border p-1 overflow-x-auto sm:flex-wrap sm:overflow-visible sm:w-fit sm:rounded-lg sm:p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Dashboard view"
        >
          {dashboardTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-[500] transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:rounded-md sm:px-4 sm:py-2 ${
                tab === id
                  ? "bg-accent text-white shadow-[0_0_12px_rgba(201,162,39,0.3)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div>
          <section aria-label="Macro indicators">
            <SectionHeader icon={Activity} label="Macro" />
            <MacroIndicators />
            <p className="mt-3 text-[11px] text-muted">
              Macro data sourced from{" "}
              <a
                href="https://fred.stlouisfed.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-accent transition-colors duration-200 cursor-pointer"
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
            <SectionHeader icon={Globe} label="Global Macro" />
            <GlobalMacroPanel />
          </section>

          <section aria-label="Market indices">
            <SectionHeading>Indices</SectionHeading>
            <MarketOverview />
          </section>

          <section aria-label="Live quotes" className="mt-4">
            <SectionHeader icon={Radio} label="Live quotes" />
            <LivePriceDemo />
            <p className="mt-3 text-[11px] text-muted">
              Quotes refresh about every 20 seconds while this tab is visible.
              Data is delayed; not for trading decisions.
            </p>
          </section>
        </div>
      )}

      {tab === "rates" && (
        <div>
          <section aria-label="Currencies">
            <SectionHeader icon={DollarSign} label="Currencies" />
            <CurrenciesPanel />
          </section>

          <section aria-label="Yield curve" className="mt-6">
            <YieldCurveMonitor />
          </section>

          <section aria-label="10Y and 2Y Treasury history" className="mt-6">
            <Treasury10y2yChart />
          </section>
        </div>
      )}

      {tab === "insights" && (
        <div>
          <section aria-label="Visual Capitalist insight">
            <SectionHeader icon={ImageIcon} label="Visual Capitalist Insight" />
            <VisualCapitalistCard />
          </section>
        </div>
      )}

      {tab === "markets" && <DashboardMarketsPanel />}
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

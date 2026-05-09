"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import MarketOverview from "@/components/MarketOverview";
import MacroIndicators from "@/components/MacroIndicators";
import DashboardPortfolioPanel from "@/components/dashboard/DashboardPortfolioPanel";
import { Activity, Loader2 } from "lucide-react";

function SectionHeader({
  icon: Icon,
  label,
  accentColor = "var(--color-primary)",
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
      <span className="text-label">{label}</span>
    </div>
  );
}

function DashboardInner() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <div className="space-y-0 min-w-0">
      <div className="flex flex-col gap-3 mb-4">
        {firstName && (
          <p
            className="text-xs mb-1"
            style={{ color: "var(--color-muted)", fontFamily: "var(--font-body)" }}
          >
            {getGreeting()}, {firstName}
          </p>
        )}
      </div>

      <Suspense fallback={<div className="skeleton h-64 w-full rounded-xl mb-6" />}>
        <DashboardPortfolioPanel />
      </Suspense>

      <section aria-label="Market pulse" className="mt-6">
        <SectionHeader icon={Activity} label="Market Pulse" />
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
        <MarketOverview />
        <p className="mt-3 text-[11px] text-muted">
          Quotes refresh about every 20 seconds while this page is visible. Data is delayed; not for
          trading decisions.
        </p>
      </section>
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

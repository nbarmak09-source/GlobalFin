"use client";

import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import Treasury10y2yChart from "@/components/Treasury10y2yChart";
import { useFixedIncomeData } from "@/hooks/useFixedIncomeData";
import {
  CreditSpreadsCard,
  MoneyMarketsCard,
  SovereignDebtTable,
} from "@/components/fixed-income/FixedIncomePanels";

export default function FixedIncomePage() {
  const { sovereign, spreads, money, loading } = useFixedIncomeData();

  const loadingText = loading ? (
    <p className="text-xs text-muted">Live rates loading from Yahoo Finance…</p>
  ) : null;

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Fixed Income"
        subtitle="Cost of capital dashboard: sovereign curves, spreads, and money markets."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <LineChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rates &amp; spreads</span>
          </div>
        }
      />

      {loadingText}

      <section aria-label="Yield curve">
        <YieldCurveMonitor />
      </section>

      <section aria-label="10Y and 2Y Treasury history">
        <Treasury10y2yChart />
      </section>

      <SovereignDebtTable sovereign={sovereign} />

      <section className="grid gap-4 md:grid-cols-2">
        <CreditSpreadsCard spreads={spreads} />
        <MoneyMarketsCard money={money} />
      </section>
    </div>
  );
}


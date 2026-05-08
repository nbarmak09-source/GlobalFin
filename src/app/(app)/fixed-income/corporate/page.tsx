"use client";

import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useFixedIncomeData } from "@/hooks/useFixedIncomeData";
import {
  CreditSpreadsCard,
  MoneyMarketsCard,
} from "@/components/fixed-income/FixedIncomePanels";

export default function FixedIncomeCorporatePage() {
  const { spreads, money, loading } = useFixedIncomeData();

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Corporate bonds"
        subtitle="IG / HY spread levels vs 10Y UST plus front-end funding rates."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <LineChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Credit</span>
          </div>
        }
      />
      {loading && (
        <p className="text-xs text-muted">Live rates loading from Yahoo Finance…</p>
      )}
      <section className="grid gap-4 md:grid-cols-2">
        <CreditSpreadsCard spreads={spreads} />
        <MoneyMarketsCard money={money} />
      </section>
    </div>
  );
}

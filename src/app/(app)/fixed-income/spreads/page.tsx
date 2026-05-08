"use client";

import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useFixedIncomeData } from "@/hooks/useFixedIncomeData";
import { CreditSpreadsCard } from "@/components/fixed-income/FixedIncomePanels";

export default function FixedIncomeSpreadsPage() {
  const { spreads, loading } = useFixedIncomeData();

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Credit spreads"
        subtitle="Benchmark corporate and structured spread proxies vs the 10-year Treasury."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <LineChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spreads</span>
          </div>
        }
      />
      {loading && (
        <p className="text-xs text-muted">Live rates loading from Yahoo Finance…</p>
      )}
      <CreditSpreadsCard spreads={spreads} />
    </div>
  );
}

"use client";

import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useFixedIncomeData } from "@/hooks/useFixedIncomeData";
import { SovereignDebtTable } from "@/components/fixed-income/FixedIncomePanels";

export default function FixedIncomeGovernmentPage() {
  const { sovereign, loading } = useFixedIncomeData();

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Government bonds"
        subtitle="G7 sovereign yield proxies (ETFs / indices) from the fixed-income feed."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <LineChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sovereign</span>
          </div>
        }
      />
      {loading && (
        <p className="text-xs text-muted">Live rates loading from Yahoo Finance…</p>
      )}
      <SovereignDebtTable sovereign={sovereign} />
    </div>
  );
}

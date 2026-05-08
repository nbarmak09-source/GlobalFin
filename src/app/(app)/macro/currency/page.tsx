"use client";

import { DollarSign } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import CurrenciesPanel from "@/components/CurrenciesPanel";
import MacroNewsSection from "@/components/macro/MacroNewsSection";

export default function MacroCurrencyPage() {
  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Currency"
        subtitle="Major FX crosses and dollar breadth — same panel as the dashboard Rates & FX view."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">FX</span>
          </div>
        }
      />

      <section aria-label="Currency markets">
        <CurrenciesPanel />
      </section>

      <MacroNewsSection topic="currency" />
    </div>
  );
}

"use client";

import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import PortfolioPerformanceChart from "@/components/PortfolioPerformanceChart";
import PortfolioEarningsUpcoming from "@/components/PortfolioEarningsUpcoming";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";

export default function PortfolioPerformancePage() {
  const {
    portfolios,
    activePortfolioId,
    setActivePortfolioId,
    loading,
  } = useActivePortfolio();

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Portfolio performance"
        subtitle="Mark-to-market history for the selected portfolio."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">P&amp;L</span>
          </div>
        }
      />

      {!loading && portfolios.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {portfolios.length <= 4 ? (
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-1 bg-card/50">
              {portfolios.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePortfolioId(p.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    p.id === activePortfolioId
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground hover:bg-card-hover"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={activePortfolioId ?? ""}
              onChange={(e) => setActivePortfolioId(e.target.value || null)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground min-w-[12rem]"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <section aria-label="Performance chart">
        <PortfolioPerformanceChart portfolioId={activePortfolioId} />
      </section>

      <section aria-label="Upcoming earnings">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
          Upcoming earnings
        </h2>
        <PortfolioEarningsUpcoming />
      </section>
    </div>
  );
}

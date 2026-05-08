"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import type { EnrichedPosition } from "@/lib/types";

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function PortfolioRiskPage() {
  const {
    portfolios,
    activePortfolioId,
    setActivePortfolioId,
    loading: portfoliosLoading,
  } = useActivePortfolio();
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePortfolioId) {
      setPositions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/portfolio?portfolioId=${encodeURIComponent(activePortfolioId)}`,
          { credentials: "include" }
        );
        if (!cancelled && res.ok) {
          setPositions(await res.json());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePortfolioId]);

  const { totalMV, rows, hhi, effectiveN, topWeightPct } = useMemo(() => {
    const totalMV = positions.reduce((s, p) => s + p.marketValue, 0);
    const rows = [...positions]
      .map((p) => ({
        ...p,
        weight: totalMV > 0 ? (p.marketValue / totalMV) * 100 : 0,
      }))
      .sort((a, b) => b.weight - a.weight);
    const wFrac = rows.map((r) => r.weight / 100);
    const hhi = wFrac.reduce((s, w) => s + w * w, 0);
    const effectiveN = hhi > 0 ? 1 / hhi : 0;
    const topWeightPct = rows[0]?.weight ?? 0;
    return { totalMV, rows, hhi, effectiveN, topWeightPct };
  }, [positions]);

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Portfolio risk snapshot"
        subtitle="Concentration via Herfindahl-Hirschman (weights) and largest positions."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Concentration</span>
          </div>
        }
      />

      {!portfoliosLoading && portfolios.length > 0 && (
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

      {loading && (
        <p className="text-sm text-muted">Loading positions…</p>
      )}

      {!loading && positions.length === 0 && (
        <p className="text-sm text-muted">
          Add holdings to see concentration metrics.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted mb-1">Effective # of names</div>
              <div className="text-2xl font-mono font-semibold tabular-nums">
                {effectiveN.toFixed(2)}
              </div>
              <p className="text-[11px] text-muted mt-2">
                1 ÷ Σw² — higher means more diversified (max equals position count if equal-weight).
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted mb-1">HHI (weights)</div>
              <div className="text-2xl font-mono font-semibold tabular-nums">
                {(hhi * 10000).toFixed(0)}
              </div>
              <p className="text-[11px] text-muted mt-2">
                Σw² on a 0–10,000 scale (common antitrust convention).
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs text-muted mb-1">Largest weight</div>
              <div className="text-2xl font-mono font-semibold tabular-nums">
                {topWeightPct.toFixed(1)}%
              </div>
              <p className="text-[11px] text-muted mt-2">
                Portfolio MV: {fmtUsd(totalMV)}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-right">Market value</th>
                  <th className="px-4 py-3 text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.symbol}
                    className="border-b border-border last:border-0 hover:bg-card-hover"
                  >
                    <td className="px-4 py-3 font-medium">{r.symbol}</td>
                    <td className="px-4 py-3 text-muted">{r.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmtUsd(r.marketValue)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.weight.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

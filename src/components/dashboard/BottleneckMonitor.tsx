"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, ChevronDown, ChevronRight } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import {
  SUPPLY_CHAIN_LAYERS_DATA,
  pickRepresentativeCompany,
  buildSupplyChainLayerHref,
} from "@/lib/supplyChainLookup";

const RISK_BAR_BG: Record<string, string> = {
  critical: "var(--red)",
  high: "#f59e0b",
  medium: "#14b8a6",
  low: "var(--green)",
};

function riskLabel(risk: string): string {
  if (!risk) return "—";
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

function quoteForSymbol(
  quotes: Record<string, StockQuote>,
  ticker: string | null | undefined
): StockQuote | undefined {
  if (!ticker?.trim()) return undefined;
  const u = ticker.trim().toUpperCase();
  return (
    quotes[u] ??
    (u === "GOOGL" ? quotes.GOOG : undefined) ??
    (u === "GOOG" ? quotes.GOOGL : undefined)
  );
}

export default function BottleneckMonitor() {
  const rows = useMemo(
    () =>
      SUPPLY_CHAIN_LAYERS_DATA.layers.map((layer) => ({
        layer,
        rep: pickRepresentativeCompany(layer.companies),
      })),
    []
  );

  const tickers = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map((r) => r.rep.ticker?.toUpperCase())
            .filter((t): t is string => Boolean(t))
        ),
      ],
    [rows]
  );

  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [expanded, setExpanded] = useState(false);

  const loadQuotes = useCallback(async () => {
    if (tickers.length === 0) return;
    const res = await fetch(
      `/api/stocks?action=quotes&symbols=${encodeURIComponent(tickers.join(","))}`
    );
    if (!res.ok) return;
    const data = (await res.json()) as StockQuote[];
    const next: Record<string, StockQuote> = {};
    for (const q of data) {
      if (q?.symbol) next[q.symbol.toUpperCase()] = q;
    }
    setQuotes(next);
  }, [tickers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuotes();
    const id = window.setInterval(loadQuotes, 60_000);
    return () => window.clearInterval(id);
  }, [loadQuotes]);

  return (
    <section aria-label="Bottleneck monitor" className="min-w-0">
      <div
        className="flex items-center gap-2 mt-6 mb-3"
        style={{
          borderLeft: "2px solid var(--accent)",
          paddingLeft: "10px",
        }}
      >
        <Flame className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
        <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
          Bottleneck
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-card-hover/40 transition-colors"
          aria-expanded={expanded}
        >
          <div
            className={`min-w-0 flex-1 ${expanded ? "" : "max-h-[120px] overflow-hidden"}`}
          >
            {!expanded ? (
              <div className="flex gap-1 w-full items-end">
                {rows.map(({ layer, rep }) => {
                  const bg = RISK_BAR_BG[layer.bottleneckRisk] ?? "var(--muted)";
                  const tip = `${layer.name} · ${riskLabel(layer.bottleneckRisk)} · ${rep.name} (${rep.moatType})`;
                  return (
                    <div
                      key={layer.id}
                      className="flex-1 min-w-0 flex flex-col gap-1"
                    >
                      <div
                        className="h-8 w-full rounded-sm shrink-0 opacity-95 hover:opacity-100 transition-opacity"
                        style={{ background: bg }}
                        title={tip}
                      />
                      <span className="text-[10px] font-mono text-center text-muted leading-none">
                        {layer.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1 pb-1">
                <table className="w-full text-left text-[11px] min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase tracking-wider">
                      <th className="py-2 pr-2 font-medium">Layer</th>
                      <th className="py-2 pr-2 font-medium">Key company</th>
                      <th className="py-2 pr-2 font-medium">Ticker</th>
                      <th className="py-2 pr-2 font-medium text-right">Price</th>
                      <th className="py-2 pr-2 font-medium text-right">Δ% today</th>
                      <th className="py-2 pr-2 font-medium">Risk level</th>
                      <th className="py-2 pr-2 font-medium min-w-[120px]">
                        Concentration
                      </th>
                      <th className="py-2 pl-2 font-medium text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ layer, rep }) => {
                      const q = quoteForSymbol(quotes, rep.ticker);
                      const pct = q?.regularMarketChangePercent;
                      const pos = (pct ?? 0) >= 0;
                      return (
                        <tr
                          key={layer.id}
                          className="border-b border-border/60 last:border-0 hover:bg-card-hover/40"
                        >
                          <td className="py-2 pr-2 font-mono text-accent whitespace-nowrap">
                            {layer.id}
                          </td>
                          <td className="py-2 pr-2 text-foreground">{rep.name}</td>
                          <td className="py-2 pr-2 font-mono text-muted">
                            {rep.ticker ?? "—"}
                          </td>
                          <td className="py-2 pr-2 text-right font-mono text-foreground">
                            {q
                              ? q.regularMarketPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "—"}
                          </td>
                          <td
                            className={`py-2 pr-2 text-right font-mono ${
                              pct === undefined
                                ? "text-muted"
                                : pos
                                  ? "text-green"
                                  : "text-red"
                            }`}
                          >
                            {pct === undefined
                              ? "—"
                              : `${pos ? "+" : ""}${pct.toFixed(2)}%`}
                          </td>
                          <td className="py-2 pr-2 text-muted whitespace-nowrap">
                            {riskLabel(layer.bottleneckRisk)}
                          </td>
                          <td className="py-2 pr-2 text-muted max-w-[200px]">
                            {rep.concentrationNote}
                          </td>
                          <td className="py-2 pl-2 text-right whitespace-nowrap">
                            <Link
                              href={buildSupplyChainLayerHref(layer.id, rep)}
                              className="text-accent hover:underline font-medium"
                            >
                              View full layer
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <span className="shrink-0 text-muted pt-0.5" aria-hidden>
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        </button>
      </div>
    </section>
  );
}

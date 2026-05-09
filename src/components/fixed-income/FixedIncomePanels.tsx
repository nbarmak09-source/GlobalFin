"use client";

import { TrendingUp } from "lucide-react";
import type {
  MoneyRow,
  SovereignRow,
  SpreadRow,
} from "@/hooks/useFixedIncomeData";

export function SovereignDebtTable({ sovereign }: { sovereign: SovereignRow[] }) {
  return (
    <section
      aria-label="Sovereign debt"
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card-hover/30">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          G7 sovereign debt snapshot
        </h2>
        <span className="text-xs text-muted">
          10Y benchmark &mdash; level (% yield)
        </span>
      </div>
      <div className="divide-y divide-border/60 text-sm">
        {sovereign.map((r) => (
          <div
            key={r.symbol}
            className="flex items-center justify-between px-5 py-2"
          >
            <div className="flex flex-col">
              <span className="font-medium">{r.country}</span>
              <span className="text-xs text-muted">{r.symbol}</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">
                {r.level == null ? "—" : r.level.toFixed(2)}
              </div>
              {r.level != null && r.changePercent != null ? (
                <div
                  className={`text-xs font-mono ${
                    r.changePercent >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {r.changePercent >= 0 ? "+" : ""}
                  {r.changePercent.toFixed(2)}%
                </div>
              ) : (
                <div className="text-xs font-mono text-muted">—</div>
              )}
            </div>
          </div>
        ))}
        {!sovereign.length && (
          <div className="px-5 py-4 text-xs text-muted">
            No sovereign data available right now.
          </div>
        )}
      </div>
    </section>
  );
}

export function CreditSpreadsCard({ spreads }: { spreads: SpreadRow[] }) {
  return (
    <div
      aria-label="Credit spreads"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 className="text-sm font-semibold mb-3">Credit spreads vs 10Y UST</h2>
      <div className="space-y-2 text-sm">
        {spreads.map((r) => (
          <div
            key={r.symbol}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-muted">{r.symbol}</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">{r.level.toFixed(2)}</div>
              <div className="text-xs text-muted font-mono">
                Spread: {r.spreadVs10Y.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
        {!spreads.length && (
          <div className="text-xs text-muted">
            No spread data available right now.
          </div>
        )}
      </div>
    </div>
  );
}

export function MoneyMarketsCard({ money }: { money: MoneyRow[] }) {
  return (
    <div
      aria-label="Money market"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 className="text-sm font-semibold mb-3">
        Money markets &amp; short‑term rates
      </h2>
      <div className="space-y-2 text-sm">
        {money.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between"
          >
            <span>{r.name}</span>
            <span className="font-mono">
              {r.value.toFixed(2)}
              {r.unit}
            </span>
          </div>
        ))}
        {!money.length && (
          <div className="text-xs text-muted">
            No money‑market data available right now.
          </div>
        )}
      </div>
    </div>
  );
}

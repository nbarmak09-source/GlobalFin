"use client";

import { useEffect, useState } from "react";
import { LineChart, TrendingUp } from "lucide-react";
import YieldCurveMonitor from "@/components/YieldCurveMonitor";
import Treasury10y2yChart from "@/components/Treasury10y2yChart";

type SovereignRow = { country: string; symbol: string; level: number; changePercent: number };
type SpreadRow = { name: string; symbol: string; level: number; spreadVs10Y: number };
type MoneyRow = { name: string; value: number; unit: string };

export default function FixedIncomePage() {
  const [sovereign, setSovereign] = useState<SovereignRow[]>([]);
  const [spreads, setSpreads] = useState<SpreadRow[]>([]);
  const [money, setMoney] = useState<MoneyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [a, b, c] = await Promise.all([
          fetch("/api/fixed-income/sovereign"),
          fetch("/api/fixed-income/credit-spreads"),
          fetch("/api/fixed-income/money-markets"),
        ]);
        const sovereignJson = await a.json();
        const spreadsJson = await b.json();
        const moneyJson = await c.json();
        setSovereign(sovereignJson.rows ?? []);
        setSpreads(spreadsJson.spreads ?? []);
        setMoney(moneyJson.rows ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadingText = loading ? (
    <p className="text-xs text-muted">Live rates loading from Yahoo Finance…</p>
  ) : null;

  return (
    <div className="space-y-8 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Fixed Income &amp; Credit
          </h1>
          <p className="text-sm text-muted">
            Cost of capital dashboard: sovereign curves, spreads, and money markets.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
          <LineChart className="h-3.5 w-3.5" />
          <span>Rates &amp; spreads</span>
        </div>
      </header>

      {loadingText}

      <section aria-label="Yield curve">
        <YieldCurveMonitor />
      </section>

      <section aria-label="10Y and 2Y Treasury history">
        <Treasury10y2yChart />
      </section>

      <section
        aria-label="Sovereign debt"
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card-hover/30">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            G7 sovereign debt snapshot
          </h2>
          <span className="text-xs text-muted">Level (proxy ETFs / indices)</span>
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
                  {r.level.toFixed(2)}
                </div>
                <div
                  className={`text-xs font-mono ${
                    r.changePercent >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {r.changePercent >= 0 ? "+" : ""}
                  {r.changePercent.toFixed(2)}%
                </div>
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

      <section className="grid gap-4 md:grid-cols-2">
        <div
          aria-label="Credit spreads"
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2 className="text-sm font-semibold mb-3">
            Credit spreads vs 10Y UST
          </h2>
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
                  <div className="font-mono text-sm">
                    {r.level.toFixed(2)}
                  </div>
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
      </section>
    </div>
  );
}


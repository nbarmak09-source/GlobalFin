"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import CommodityCharts from "@/components/CommodityCharts";
import MacroNewsSection from "@/components/macro/MacroNewsSection";

type AssetRow = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
};

export default function MacroCommoditiesPage() {
  const [commodities, setCommodities] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/alternatives/commodities", {
          credentials: "include",
        });
        const json = await res.json();
        setCommodities(json.rows ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Commodities"
        subtitle="Key futures and ETF proxies with history charts — data from the alternatives commodity feed."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Flame className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Real assets</span>
          </div>
        }
      />

      {loading && (
        <p className="text-xs text-muted">Loading commodity snapshot…</p>
      )}

      <section
        aria-label="Commodity spot snapshot"
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" />
            Spot snapshot
          </h2>
          <span className="text-xs text-muted">Delayed quotes</span>
        </div>
        <div className="space-y-2 text-sm">
          {commodities.map((r) => (
            <div
              key={r.symbol}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{r.name}</span>
                <span className="text-xs text-muted">{r.symbol}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm">{r.price.toFixed(2)}</div>
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
          {!commodities.length && !loading && (
            <p className="text-xs text-muted">No commodity rows returned.</p>
          )}
        </div>
      </section>

      <section aria-label="Commodity charts">
        <CommodityCharts />
      </section>

      <MacroNewsSection topic="commodities" />
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { PieChart, RefreshCw } from "lucide-react";
import type { EnrichedPosition, QuoteSummaryData } from "@/lib/types";

interface AllocationEntry {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  marketValue: number;
  weight: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-500",
  Healthcare: "bg-emerald-500",
  Financials: "bg-amber-500",
  "Consumer Cyclical": "bg-purple-500",
  "Consumer Defensive": "bg-pink-500",
  "Communication Services": "bg-cyan-500",
  Industrials: "bg-orange-500",
  Energy: "bg-red-500",
  Utilities: "bg-teal-500",
  "Real Estate": "bg-lime-500",
  "Basic Materials": "bg-yellow-500",
  Other: "bg-gray-500",
};

function getColor(sector: string) {
  return SECTOR_COLORS[sector] || SECTOR_COLORS.Other;
}

function DonutChart({
  slices,
  label,
}: {
  slices: { name: string; value: number; color: string }[];
  label: string;
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  let cumulative = 0;
  const arcs = slices.map((sl) => {
    const pct = sl.value / total;
    const start = cumulative;
    cumulative += pct;
    return { ...sl, start, end: cumulative, pct };
  });

  const SIZE = 160;
  const R = 60;
  const INNER = 40;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  function arcPath(startPct: number, endPct: number, r: number) {
    const startAngle = startPct * 2 * Math.PI - Math.PI / 2;
    const endAngle = endPct * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + r * Math.cos(startAngle);
    const y1 = CY + r * Math.sin(startAngle);
    const x2 = CX + r * Math.cos(endAngle);
    const y2 = CY + r * Math.sin(endAngle);
    const largeArc = endPct - startPct > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
        {label}
      </h3>
      <div className="flex items-start gap-6">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-40 h-40 shrink-0"
        >
          {arcs.map((a, i) => {
            if (a.pct < 0.001) return null;
            const adjustedEnd = Math.min(a.end, 0.9999);
            return (
              <path
                key={i}
                d={`${arcPath(a.start, adjustedEnd, R)} L ${CX + INNER * Math.cos(adjustedEnd * 2 * Math.PI - Math.PI / 2)} ${CY + INNER * Math.sin(adjustedEnd * 2 * Math.PI - Math.PI / 2)} ${arcPath(adjustedEnd, a.start, INNER).replace("M", "A " + INNER + " " + INNER + " 0 " + (a.pct > 0.5 ? 1 : 0) + " 0 ").replace(/A \d+ \d+ 0 [01] 1/, `A ${INNER} ${INNER} 0 ${a.pct > 0.5 ? 1 : 0} 0`)} Z`}
                className={a.color.replace("bg-", "fill-")}
                opacity={0.85}
              />
            );
          })}
        </svg>
        <div className="space-y-1.5 min-w-0">
          {arcs
            .filter((a) => a.pct >= 0.001)
            .sort((a, b) => b.pct - a.pct)
            .map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${a.color}`}
                />
                <span className="truncate text-foreground">{a.name}</span>
                <span className="ml-auto text-muted tabular-nums">
                  {(a.pct * 100).toFixed(1)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function AllocationPage() {
  const [entries, setEntries] = useState<AllocationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const posRes = await fetch("/api/portfolio", { credentials: "include" });
      if (!posRes.ok) return;
      const positions: EnrichedPosition[] = await posRes.json();
      if (positions.length === 0) {
        setEntries([]);
        return;
      }

      const summaries = await Promise.all(
        positions.map(async (p) => {
          try {
            const res = await fetch(
              `/api/stocks?action=summary&symbol=${encodeURIComponent(p.symbol)}`,
              { credentials: "include" }
            );
            if (res.ok) return (await res.json()) as QuoteSummaryData;
          } catch {
            // skip
          }
          return null;
        })
      );

      const totalValue = positions.reduce((s, p) => s + p.marketValue, 0);

      const result: AllocationEntry[] = positions.map((p, i) => {
        const summary = summaries[i];
        return {
          symbol: p.symbol,
          name: p.name,
          sector: summary?.sector || "Other",
          country: summary?.country || "US",
          marketValue: p.marketValue,
          weight: totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0,
        };
      });

      setEntries(result);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectorSlices = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.sector, (map.get(e.sector) || 0) + e.marketValue);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
      color: getColor(name),
    }));
  }, [entries]);

  const countrySlices = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const geo = e.country === "United States" || e.country === "US" ? "US" : e.country || "Other";
      map.set(geo, (map.get(geo) || 0) + e.marketValue);
    });
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color:
        [
          "bg-blue-500",
          "bg-emerald-500",
          "bg-amber-500",
          "bg-purple-500",
          "bg-pink-500",
          "bg-cyan-500",
          "bg-orange-500",
        ][i % 7],
    }));
  }, [entries]);

  const concentrationSlices = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.marketValue - a.marketValue);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const colors = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-purple-500",
      "bg-pink-500",
    ];
    const slices = top5.map((e, i) => ({
      name: e.symbol,
      value: e.marketValue,
      color: colors[i],
    }));
    const restValue = rest.reduce((s, e) => s + e.marketValue, 0);
    if (restValue > 0) {
      slices.push({ name: "Others", value: restValue, color: "bg-gray-500" });
    }
    return slices;
  }, [entries]);

  if (loading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Asset Allocation
          </h1>
          <p className="text-sm text-muted">Loading portfolio data...</p>
        </header>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Asset Allocation
          </h1>
          <p className="text-sm text-muted">
            Add positions to your portfolio to see allocation breakdowns.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Asset Allocation
          </h1>
          <p className="text-sm text-muted">
            Portfolio breakdown by sector, geography, and concentration.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent hover:bg-accent/20 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <DonutChart slices={sectorSlices} label="By Sector" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <DonutChart slices={countrySlices} label="By Geography" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <DonutChart slices={concentrationSlices} label="Top Holdings" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Position Detail
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Sector</th>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-right">Market Value</th>
                <th className="px-4 py-3 text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {[...entries]
                .sort((a, b) => b.weight - a.weight)
                .map((e) => (
                  <tr
                    key={e.symbol}
                    className="border-b border-border last:border-0 hover:bg-card-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{e.symbol}</td>
                    <td className="px-4 py-3 text-muted">{e.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${getColor(e.sector)}`}
                        />
                        {e.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{e.country}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(e.marketValue)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {e.weight.toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

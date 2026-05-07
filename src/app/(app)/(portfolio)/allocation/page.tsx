"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts";
import ChartExportButton from "@/components/ChartExportButton";
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

/** Accessible donut palette — applied in order per segment (index). */
const DONUT_PALETTE = [
  "#c9a227",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#06b6d4",
] as const;

function donutSliceFill(index: number) {
  return DONUT_PALETTE[index % DONUT_PALETTE.length];
}

function DonutChartLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  if (
    cx == null ||
    cy == null ||
    midAngle == null ||
    innerRadius == null ||
    outerRadius == null ||
    percent == null
  ) {
    return null;
  }
  const label =
    name != null && name !== ""
      ? `${String(name)} ${(percent * 100).toFixed(1)}%`
      : `${(percent * 100).toFixed(1)}%`;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="currentColor"
      className="text-foreground"
      style={{ fontSize: 12 }}
    >
      {label}
    </text>
  );
}

function DonutChart({
  slices,
  label,
  showLabels = true,
}: {
  slices: { name: string; value: number }[];
  label: string;
  /** In-chart segment labels. Off for long multi-slice data (e.g. sectors) to avoid overlap; legend still lists names. */
  showLabels?: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const data = slices.map((sl) => ({
    name: sl.name,
    value: sl.value,
  }));

  const legendRows = data
    .map((row, index) => ({
      ...row,
      pct: row.value / total,
      fill: donutSliceFill(index),
    }))
    .filter((row) => row.pct >= 0.001)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
        {label}
      </h3>
      <div ref={chartRef} className="relative flex items-start gap-6">
        <ChartExportButton
          chartRef={chartRef}
          filename={`asset-allocation-${label}`}
          title={`Asset Allocation - ${label}`}
        />
        <div className="min-h-[260px] w-full min-w-0 flex-1 [&_.recharts-layer]:outline-none">
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <RechartsPieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={3}
                label={showLabels ? DonutChartLabel : false}
                labelLine={false}
                isAnimationActive={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={donutSliceFill(index)}
                    stroke="transparent"
                    strokeWidth={0}
                  />
                ))}
              </Pie>
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 min-w-0">
          {legendRows.map((a, i) => (
            <div key={`${a.name}-${i}`} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: a.fill }}
              />
              <span className="truncate text-foreground">{a.name}</span>
              <span className="ml-auto tabular-nums text-muted">
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
  }, []);

  const sectorSlices = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.sector, (map.get(e.sector) || 0) + e.marketValue);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [entries]);

  const countrySlices = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const geo = e.country === "United States" || e.country === "US" ? "US" : e.country || "Other";
      map.set(geo, (map.get(geo) || 0) + e.marketValue);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [entries]);

  const concentrationSlices = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.marketValue - a.marketValue);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const slices = top5.map((e) => ({
      name: e.symbol,
      value: e.marketValue,
    }));
    const restValue = rest.reduce((s, e) => s + e.marketValue, 0);
    if (restValue > 0) {
      slices.push({ name: "Others", value: restValue });
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
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 min-w-0">
          <DonutChart
            slices={sectorSlices}
            label="By Sector"
            showLabels={false}
          />
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

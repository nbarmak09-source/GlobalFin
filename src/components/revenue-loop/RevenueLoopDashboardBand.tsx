"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import type { RevenueLoopsFile } from "@/lib/revenueLoopTypes";
import { useOrganicRevenueOnly } from "@/lib/revenue-loop-context";
import { fmtBn } from "@/lib/formatBn";

const LABEL_MAP: Record<string, string> = {
  "Mic→Ope": "Microsoft → OpenAI",
  "Goo→Ant": "Google → Anthropic",
  "Ama→Ant": "Amazon → Anthropic",
};

interface RevenueLoopDashboardBandProps {
  /** When true, shows the organic-revenue toggle in the card header (e.g. Research → Ecosystem Map). */
  showOrganicToggle?: boolean;
}

export default function RevenueLoopDashboardBand({
  showOrganicToggle = false,
}: RevenueLoopDashboardBandProps) {
  const { organicOnly, setOrganicOnly } = useOrganicRevenueOnly();
  const [data, setData] = useState<RevenueLoopsFile | null>(null);

  useEffect(() => {
    fetch("/data/revenue-loops.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.loops
      .filter((l) => l.roundTripDetected)
      .map((l) => ({
        name: `${l.investorLabel.slice(0, 3)}→${l.investeeLabel.slice(0, 3)}`,
        fullLabel: `${l.investorLabel} → ${l.investeeLabel}`,
        organic: l.organicRevenueEstimateBn,
        roundTrip: l.roundTripRevenueEstimateBn,
        /** What the bar shows: strip round-trip when organic-only mode. */
        displayOrganic: l.organicRevenueEstimateBn,
        displayRoundTrip: organicOnly ? 0 : l.roundTripRevenueEstimateBn,
      }));
  }, [data, organicOnly]);

  if (!data || chartData.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Round-trip revenue">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Inferred round-trip cloud revenue
          </h3>
          <p className="text-xs text-muted mt-0.5 max-w-xl">
            Stacked: organic estimate vs. inferred recycling from equity-linked cloud/API
            spend. Use Organic revenue only to strip the red (round-trip) layer.
          </p>
        </div>
        {showOrganicToggle && (
          <label className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-[11px] text-muted hover:bg-card-hover hover:text-foreground border border-border shrink-0 self-start">
            <input
              type="checkbox"
              checked={organicOnly}
              onChange={(e) => setOrganicOnly(e.target.checked)}
              className="rounded border-border accent-accent shrink-0"
            />
            <span className="leading-tight whitespace-nowrap">Organic revenue only</span>
          </label>
        )}
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2d333b" vertical={false} />
            <XAxis
              dataKey="name"
              height={60}
              tick={{ fill: "#8b949e", fontSize: 10, angle: -25, textAnchor: "end" }}
              tickFormatter={(value) => LABEL_MAP[value] ?? value}
              axisLine={{ stroke: "#2d333b" }}
            />
            <YAxis
              tick={{ fill: "#8b949e", fontSize: 10 }}
              tickFormatter={(v) => `$${v}B`}
              axisLine={{ stroke: "#2d333b" }}
            />
            <Tooltip
              labelFormatter={(label) =>
                LABEL_MAP[String(label)] ?? String(label)
              }
              formatter={(value, name) => {
                const n =
                  typeof value === "number"
                    ? value
                    : Number(value ?? 0);
                return [fmtBn(n), String(name)];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="displayOrganic"
              stackId="a"
              fill="#10b981"
              name="Organic (est.)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="displayRoundTrip"
              stackId="a"
              fill="#dc2626"
              name={
                organicOnly
                  ? "Round-trip (stripped)"
                  : "Round-trip (inferred)"
              }
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

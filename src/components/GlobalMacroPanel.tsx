"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Globe, Loader2 } from "lucide-react";
import {
  WORLD_BANK_COUNTRY_CODES,
  type WorldBankSeries,
} from "@/lib/worldbank";

const COUNTRY_LABELS: Record<(typeof WORLD_BANK_COUNTRY_CODES)[number], string> =
  {
    US: "United States",
    GB: "United Kingdom",
    EU: "European Union",
    CN: "China",
    JP: "Japan",
    IN: "India",
    BR: "Brazil",
    WLD: "World",
  };

interface GlobalMacroPayload {
  country: string;
  gdpGrowth: WorldBankSeries | null;
  inflation: WorldBankSeries | null;
  unemployment: WorldBankSeries | null;
}

function SparkBlock({
  title,
  series,
  color,
  valueFormatter,
}: {
  title: string;
  series: WorldBankSeries | null;
  color: string;
  valueFormatter: (v: number) => string;
}) {
  const data =
    series?.values.map((d) => ({
      year: String(d.year),
      value: d.value,
    })) ?? [];

  const latest = series?.values.length
    ? series.values[series.values.length - 1]
    : null;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-3 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-xs font-medium text-foreground leading-tight">
          {title}
        </h4>
        {latest != null && (
          <span className="text-[11px] font-mono tabular-nums text-muted shrink-0">
            {valueFormatter(latest.value)}{" "}
            <span className="text-[10px] text-muted/80">({latest.year})</span>
          </span>
        )}
      </div>
      <div className="h-[72px] w-full min-w-0 min-h-[72px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={72}>
            <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 9, fill: "var(--muted-foreground, #888)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={["auto", "auto"]} />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--card, #111)",
                  border: "1px solid var(--border, #333)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(v) => [
                  valueFormatter(Number(v ?? 0)),
                  title,
                ]}
                labelFormatter={(y) => `Year ${y}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-muted">
            No data
          </div>
        )}
      </div>
      {series?.sourceUrl && (
        <a
          href={series.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[10px] text-accent hover:underline truncate max-w-full"
        >
          {series.source} — indicator
        </a>
      )}
    </div>
  );
}

export default function GlobalMacroPanel() {
  const [country, setCountry] =
    useState<(typeof WORLD_BANK_COUNTRY_CODES)[number]>("US");
  const [data, setData] = useState<GlobalMacroPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (c: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/macro-indicators/global?country=${encodeURIComponent(c)}`
      );
      if (!res.ok) {
        setError(true);
        setData(null);
        return;
      }
      const json: GlobalMacroPayload = await res.json();
      setData(json);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(country);
  }, [country, load]);

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-background overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border/80">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-4 w-4 text-accent shrink-0" aria-hidden />
          <p className="text-sm text-muted leading-snug">
            World Bank annual series (latest 5 years with data). Compare regions
            using the selector.
          </p>
        </div>
        <label className="flex items-center gap-2 shrink-0 text-xs text-muted">
          <span className="sr-only">Country or region</span>
          <select
            value={country}
            onChange={(e) =>
              setCountry(e.target.value as (typeof WORLD_BANK_COUNTRY_CODES)[number])
            }
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground font-medium min-w-[160px]"
          >
            {WORLD_BANK_COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {COUNTRY_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading World Bank data…
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-red text-center py-8">
            Could not load global macro data.
          </p>
        )}
        {!loading && !error && data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SparkBlock
              title="GDP growth (annual %)"
              series={data.gdpGrowth}
              color="var(--accent, #c9a227)"
              valueFormatter={(v) => `${v.toFixed(1)}%`}
            />
            <SparkBlock
              title="Inflation (CPI, annual %)"
              series={data.inflation}
              color="#f59e0b"
              valueFormatter={(v) => `${v.toFixed(1)}%`}
            />
            <SparkBlock
              title="Unemployment (% of labor force)"
              series={data.unemployment}
              color="#ef4444"
              valueFormatter={(v) => `${v.toFixed(1)}%`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

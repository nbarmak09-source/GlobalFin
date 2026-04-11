"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SeriesData {
  label: string;
  unit: string;
  data: { date: string; value: number }[];
}

type MacroHistoryResponse = {
  period: string;
  series: Record<string, SeriesData>;
};

const PERIODS = ["1Y", "2Y", "5Y", "10Y", "20Y", "MAX"] as const;
type Period = (typeof PERIODS)[number];

// Consistent color palette: amber=inflation/rates, red=risk, teal=activity, purple=money
const CHART_CONFIGS: {
  key: string;
  color: string;
  format: (v: number) => string;
  threshold?: number;
}[] = [
  {
    key: "cpiYoY",
    color: "#f59e0b", // amber — price/inflation category
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "unemployment",
    color: "#ef4444", // red — risk/negative indicator
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "fedFunds",
    color: "#f59e0b", // amber — rate/policy (same category as inflation)
    format: (v) => `${v.toFixed(2)}%`,
  },
  {
    key: "industrialProduction",
    color: "#14b8a6", // teal — activity/production
    format: (v) => v.toFixed(1),
  },
  {
    key: "m2",
    color: "#a78bfa", // purple — money/liquidity
    format: (v) => `$${(v / 1000).toFixed(1)}T`,
  },
  {
    key: "recessionProb",
    color: "#ef4444", // red — recession risk
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "ismManufacturing",
    color: "#14b8a6", // teal — activity/confidence
    format: (v) => v.toFixed(1),
    threshold: 0,
  },
  {
    key: "consumerSentiment",
    color: "#14b8a6", // teal — activity/confidence
    format: (v) => v.toFixed(1),
  },
];

export default function MacroCharts() {
  const [seriesMap, setSeriesMap] = useState<Record<string, SeriesData>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("5Y");
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/macro-indicators/history?period=${period}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const json: MacroHistoryResponse = await res.json();
      if (json.series) {
        setSeriesMap(json.series);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="rounded-xl bg-card border border-border p-5 text-center text-sm text-muted">
        Macro chart data unavailable. Make sure FRED_API_KEY is set.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mt-6 mb-1">
        <div
          className="flex items-center gap-2"
          style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}
        >
          <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
            Historical Trends
          </span>
        </div>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                period === p
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {CHART_CONFIGS.map((c) => (
            <div
              key={c.key}
              className="h-48 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {CHART_CONFIGS.map((cfg) => {
            const series = seriesMap[cfg.key];
            if (!series || series.data.length === 0) return null;
            return (
              <MiniChart
                key={cfg.key}
                label={series.label}
                unit={series.unit}
                data={series.data}
                color={cfg.color}
                format={cfg.format}
                threshold={cfg.threshold}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniChart({
  label,
  data,
  color,
  format,
  threshold,
}: {
  label: string;
  unit: string;
  data: { date: string; value: number }[];
  color: string;
  format: (v: number) => string;
  threshold?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<
    typeof import("lightweight-charts").createChart
  > | null>(null);

  const latest = data[data.length - 1];
  const first = data[0];
  const changePct =
    first.value !== 0
      ? ((latest.value - first.value) / Math.abs(first.value)) * 100
      : 0;

  const renderChart = useCallback(async () => {
    if (!containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = Math.max(container.clientWidth || 300, 200);

    const { createChart, ColorType, CrosshairMode, AreaSeries } =
      await import("lightweight-charts");

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(container, {
      width,
      height: 120,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b949e",
        fontFamily: "var(--font-sans-pro), sans-serif",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#ffffff14" },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      lineWidth: 2,
      topColor: `${color}30`,
      bottomColor: `${color}05`,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    series.setData(
      data.map((d) => ({
        time: d.date,
        value: d.value,
      })) as Parameters<typeof series.setData>[0]
    );

    if (threshold !== undefined) {
      series.createPriceLine({
        price: threshold,
        color: "#8b949e60",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${threshold}`,
      });
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: Math.max(containerRef.current.clientWidth || 300, 200),
        });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, [data, color, threshold]);

  useEffect(() => {
    renderChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [renderChart]);

  return (
    <div
      className="rounded-xl bg-card border border-border overflow-hidden shadow-lg shadow-black/20"
    >
      {/* Card header: label + value callout outside chart area */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[13px] font-[400] text-muted">{label}</span>
        <div className="flex items-center gap-2">
          {threshold !== undefined && (
            <span
              className={`text-[11px] font-[400] ${
                latest.value >= threshold ? "text-green" : "text-red"
              }`}
            >
              {latest.value >= threshold ? "Expanding" : "Contracting"}
            </span>
          )}
          <span className="text-[30px] font-[500] tabular-nums font-mono leading-none">
            {format(latest.value)}
          </span>
          <span
            className={`text-[13px] font-[400] tabular-nums ${changePct >= 0 ? "text-green" : "text-red"}`}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        </div>
      </div>
      {/* Chart plot area with 8px margin */}
      <div className="px-2 pb-2">
        <div ref={containerRef} className="w-full" style={{ height: 120 }} />
      </div>
    </div>
  );
}

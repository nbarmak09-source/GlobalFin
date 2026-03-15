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

const CHART_CONFIGS: {
  key: string;
  color: string;
  format: (v: number) => string;
  threshold?: number;
}[] = [
  {
    key: "cpiYoY",
    color: "#f59e0b",
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "unemployment",
    color: "#ef4444",
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "fedFunds",
    color: "#3b82f6",
    format: (v) => `${v.toFixed(2)}%`,
  },
  {
    key: "industrialProduction",
    color: "#10b981",
    format: (v) => v.toFixed(1),
  },
  {
    key: "m2",
    color: "#8b5cf6",
    format: (v) => `$${(v / 1000).toFixed(1)}T`,
  },
  {
    key: "recessionProb",
    color: "#ec4899",
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "ismManufacturing",
    color: "#f97316",
    format: (v) => v.toFixed(1),
    threshold: 0,
  },
  {
    key: "consumerSentiment",
    color: "#06b6d4",
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Historical Trends
        </h3>
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CHART_CONFIGS.map((c) => (
            <div
              key={c.key}
              className="h-56 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
      height: 160,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b949e",
        fontFamily: "var(--font-sans-pro), sans-serif",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#2d333b40" },
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <div className="flex items-center gap-2">
          {threshold !== undefined && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                latest.value >= threshold
                  ? "bg-green-500/15 text-green-500"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {latest.value >= threshold ? "Expanding" : "Contracting"}
            </span>
          )}
          <span className="text-sm font-bold tabular-nums">
            {format(latest.value)}
          </span>
          <span
            className={`text-[11px] font-medium tabular-nums ${changePct >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ height: 160 }} />
    </div>
  );
}

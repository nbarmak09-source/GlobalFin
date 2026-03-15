"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface DataPoint {
  time: string | number;
  value: number;
}

const PERIODS = [
  { id: "1D", label: "1D" },
  { id: "5D", label: "5D" },
  { id: "1M", label: "1M" },
  { id: "1Y", label: "1Y" },
  { id: "5Y", label: "5Y" },
] as const;

export default function PortfolioPerformanceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("1Y");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portfolio/performance?period=${encodeURIComponent(period)}`
      );
      const result = await res.json();
      if (res.ok && Array.isArray(result)) {
        setData(result);
      } else {
        setData([]);
        setError(result?.error || "Failed to load performance data");
      }
    } catch {
      setData([]);
      setError("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderChart = useCallback(async () => {
    if (!chartContainerRef.current || data.length === 0) return;

    const container = chartContainerRef.current;
    const width = Math.max(container.clientWidth || 400, 300);

    const {
      createChart,
      ColorType,
      CrosshairMode,
      LineSeries,
    } = await import("lightweight-charts");

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(container, {
      width,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: "#13161d" },
        textColor: "#8b949e",
        fontFamily: "var(--font-sans-pro), sans-serif",
      },
      grid: {
        vertLines: { color: "#2d333b" },
        horzLines: { color: "#2d333b" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#2d333b",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "#2d333b",
      },
    });

    chartRef.current = chart;

    const isIntraday = data.length > 0 && typeof data[0].time === "number";

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#c9a227",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    lineSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.value,
      })) as Parameters<typeof lineSeries.setData>[0]
    );

    chart.timeScale().fitContent();
    chart.timeScale().applyOptions({
      timeVisible: isIntraday,
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const w = Math.max(chartContainerRef.current.clientWidth || 400, 300);
        chartRef.current.applyOptions({ width: w });
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [data]);

  useEffect(() => {
    renderChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [renderChart]);

  if (loading) {
    return (
      <div className="h-[312px] rounded-xl bg-card border border-border flex items-center justify-center">
        <div className="text-muted text-sm">Loading performance data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[312px] rounded-xl bg-card border border-border flex flex-col items-center justify-center gap-3 px-4">
        <div className="text-muted text-sm text-center">
          <p>{error || "No performance data yet"}</p>
          <p className="text-xs mt-1">
            {error ? "Check your positions and try again." : "Add positions to see your portfolio over time."}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Portfolio Performance
        </h3>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === p.id
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full min-w-0" style={{ height: 280 }} />
    </div>
  );
}

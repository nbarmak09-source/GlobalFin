"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { Time } from "lightweight-charts";
import { TickMarkType } from "lightweight-charts";

interface DataPoint {
  time: string | number;
  value: number;
}

/** Parse chart `Time` for tick labels and visible-range hints. */
function timeToUtcDate(time: Time): Date | null {
  if (typeof time === "string") {
    const d = new Date(`${time}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof time === "number") {
    return new Date(time * 1000);
  }
  if (time && typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    const { year, month, day } = time as { year: number; month: number; day: number };
    return new Date(Date.UTC(year, month - 1, day));
  }
  return null;
}

/**
 * Human-readable time-scale ticks (library default can show bare day numbers next to month names).
 * Keep labels short (library recommends ≤8 chars).
 */
function formatPerformanceTickMark(
  time: Time,
  tickMarkType: TickMarkType,
  locale: string
): string | null {
  const d = timeToUtcDate(time);
  if (!d) return null;

  if (tickMarkType === TickMarkType.Time || tickMarkType === TickMarkType.TimeWithSeconds) {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }
  if (tickMarkType === TickMarkType.Year) {
    return new Intl.DateTimeFormat(locale, { year: "2-digit" }).format(d);
  }
  if (tickMarkType === TickMarkType.Month) {
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
  }
  // DayOfMonth — include month so it does not read like a stray integer
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
}

const PERIODS = [
  { id: "1D", label: "1D" },
  { id: "5D", label: "5D" },
  { id: "1M", label: "1M" },
  { id: "1Y", label: "1Y" },
  { id: "5Y", label: "5Y" },
] as const;

function formatGrowthDollars(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n >= 0 ? "+" : "-"}$${s}`;
}

function formatGrowthPct(n: number): string {
  const s = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n >= 0 ? "+" : "-"}${s}%`;
}

interface PortfolioPerformanceChartProps {
  /** When null, chart waits (parent loading portfolios). */
  portfolioId: string | null;
}

export default function PortfolioPerformanceChart({
  portfolioId,
}: PortfolioPerformanceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [data, setData] = useState<DataPoint[]>([]);
  const [portfolioIndexed, setPortfolioIndexed] = useState<DataPoint[]>([]);
  const [benchmarkIndexed, setBenchmarkIndexed] = useState<DataPoint[]>([]);
  const [firstValue, setFirstValue] = useState(0);
  const [lastValue, setLastValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("1Y");
  const [compareToSP500, setCompareToSP500] = useState(true);

  const hasBenchmark =
    portfolioIndexed.length > 0 &&
    benchmarkIndexed.length > 0 &&
    portfolioIndexed.length === benchmarkIndexed.length;
  const showComparison = compareToSP500 && hasBenchmark;

  const fetchData = useCallback(async () => {
    if (!portfolioId) {
      setLoading(false);
      setData([]);
      setPortfolioIndexed([]);
      setBenchmarkIndexed([]);
      setFirstValue(0);
      setLastValue(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portfolio/performance?period=${encodeURIComponent(period)}&portfolioId=${encodeURIComponent(portfolioId)}`,
        { credentials: "include" }
      );
      const result = await res.json();
      if (!res.ok) {
        setData([]);
        setPortfolioIndexed([]);
        setBenchmarkIndexed([]);
        setFirstValue(0);
        setLastValue(0);
        setError(result?.error || "Failed to load performance data");
        return;
      }
      if (Array.isArray(result)) {
        setData(result);
        setPortfolioIndexed([]);
        setBenchmarkIndexed([]);
        const fv = result.length > 0 ? result[0].value : 0;
        const lv = result.length > 0 ? result[result.length - 1].value : 0;
        setFirstValue(fv);
        setLastValue(lv);
      } else if (result?.series && Array.isArray(result.series)) {
        setData(result.series);
        setFirstValue(typeof result.firstValue === "number" ? result.firstValue : 0);
        setLastValue(typeof result.lastValue === "number" ? result.lastValue : 0);
        setPortfolioIndexed(
          Array.isArray(result.portfolioIndexed) ? result.portfolioIndexed : []
        );
        setBenchmarkIndexed(
          Array.isArray(result.benchmarkIndexed) ? result.benchmarkIndexed : []
        );
      } else {
        setData([]);
        setPortfolioIndexed([]);
        setBenchmarkIndexed([]);
        setFirstValue(0);
        setLastValue(0);
        setError("Invalid performance response");
      }
    } catch {
      setData([]);
      setPortfolioIndexed([]);
      setBenchmarkIndexed([]);
      setFirstValue(0);
      setLastValue(0);
      setError("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  }, [period, portfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    const useCompare = showComparison;
    const primary = useCompare ? portfolioIndexed : data;
    if (primary.length === 0) return;

    const container = chartContainerRef.current;
    const width = Math.max(container.clientWidth || 400, 300);

    const {
      createChart,
      ColorType,
      CrosshairMode,
      LineSeries,
      LineType,
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
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#2d333b",
        rightOffset: 0,
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: formatPerformanceTickMark,
        uniformDistribution: true,
      },
      localization: {
        locale: typeof navigator !== "undefined" ? navigator.language : "en-US",
        dateFormat: "dd MMM yyyy",
      },
    });

    chartRef.current = chart;

    const isIntraday = primary.length > 0 && typeof primary[0].time === "number";

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#c9a227",
      lineWidth: 2,
      lineType: LineType.Curved,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });

    lineSeries.setData(
      primary.map((d) => ({
        time: d.time,
        value: d.value,
      })) as Parameters<typeof lineSeries.setData>[0]
    );

    if (useCompare && benchmarkIndexed.length === primary.length) {
      const bench = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 2,
        lineType: LineType.Curved,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });
      bench.setData(
        benchmarkIndexed.map((d) => ({
          time: d.time,
          value: d.value,
        })) as Parameters<typeof bench.setData>[0]
      );
    }

    chart.timeScale().applyOptions({
      timeVisible: isIntraday,
    });

    const fromT = primary[0].time as Time;
    const toT = primary[primary.length - 1].time as Time;
    const applyRange = () => {
      try {
        chart.timeScale().setVisibleRange({ from: fromT, to: toT });
      } catch {
        chart.timeScale().fitContent();
      }
    };
    applyRange();
    requestAnimationFrame(() => {
      applyRange();
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
  }, [benchmarkIndexed, data, portfolioIndexed, showComparison]);

  useEffect(() => {
    renderChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [renderChart]);

  const growthDollars = lastValue - firstValue;
  const growthPct =
    firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  const idxFirst = portfolioIndexed[0]?.value ?? 0;
  const idxLast =
    portfolioIndexed.length > 0
      ? portfolioIndexed[portfolioIndexed.length - 1].value
      : 0;
  const portIdxPct =
    idxFirst > 0 ? ((idxLast - idxFirst) / idxFirst) * 100 : 0;
  const bFirst = benchmarkIndexed[0]?.value ?? 0;
  const bLast =
    benchmarkIndexed.length > 0
      ? benchmarkIndexed[benchmarkIndexed.length - 1].value
      : 0;
  const benchPct = bFirst > 0 ? ((bLast - bFirst) / bFirst) * 100 : 0;
  const showGrowth = data.length > 0 && !error;

  if (!portfolioId) {
    return (
      <div className="h-48 md:h-64 rounded-xl bg-card border border-border flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <p className="text-sm text-muted">
            Select a portfolio to view performance history
          </p>
          <Link
            href="/portfolio"
            className="text-xs text-accent"
          >
            Go to portfolio →
          </Link>
        </div>
      </div>
    );
  }

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
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Portfolio Performance
          </h3>
          {showGrowth && showComparison && (
            <div className="mt-1 space-y-0.5">
              <p
                className={`text-sm font-mono tabular-nums ${
                  portIdxPct >= 0 ? "text-green" : "text-red"
                }`}
              >
                Portfolio (indexed): {formatGrowthPct(portIdxPct)}
              </p>
              <p
                className={`text-sm font-mono tabular-nums ${
                  benchPct >= 0 ? "text-green" : "text-red"
                }`}
              >
                S&amp;P 500: {formatGrowthPct(benchPct)}
              </p>
              <p className="text-xs text-muted leading-snug">
                Both series rebased to 100 at the first overlapping data point.
                Relative performance only; not a dollar-for-dollar back-test.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-[#c9a227]" />
                  Portfolio
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-[#60a5fa]" />
                  S&amp;P 500
                </span>
              </div>
            </div>
          )}
          {showGrowth && !showComparison && (
            <p
              className={`mt-1 text-sm font-mono tabular-nums ${
                growthDollars >= 0 ? "text-green" : "text-red"
              }`}
            >
              Period: {formatGrowthDollars(growthDollars)} (
              {formatGrowthPct(growthPct)})
            </p>
          )}
          {showGrowth && !hasBenchmark && (
            <p className="mt-1 text-xs text-muted">
              S&amp;P 500 benchmark could not be loaded for this range.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {hasBenchmark && (
            <button
              type="button"
              onClick={() => setCompareToSP500((v) => !v)}
              aria-pressed={compareToSP500}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                compareToSP500
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-border text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              Compare to S&amp;P 500
            </button>
          )}
          <div className="flex items-center gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
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
      </div>
      <div ref={chartContainerRef} className="w-full min-w-0" style={{ height: 280 }} />
    </div>
  );
}

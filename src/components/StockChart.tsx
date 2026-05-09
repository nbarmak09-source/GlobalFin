"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import type { HistoricalDataPoint } from "@/lib/types";

type ChartTime = string | number | { year: number; month: number; day: number };

interface RangeMeasure {
  fromTime: ChartTime;
  toTime: ChartTime;
  fromValue: number;
  toValue: number;
  pctChange: number;
  dollarChange: number;
}

function formatRangeTime(time: ChartTime): string {
  let d: Date;
  if (typeof time === "string") {
    d = new Date(`${time}T12:00:00Z`);
  } else if (typeof time === "number") {
    d = new Date(time * 1000);
  } else {
    d = new Date(Date.UTC(time.year, time.month - 1, time.day));
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function getCloseFromSeriesData(seriesData: ReadonlyMap<unknown, unknown>): number | null {
  const entry = [...seriesData.values()][0];
  if (!entry || typeof entry !== "object") return null;
  if ("value" in entry) return (entry as { value: number }).value;
  if ("close" in entry) return (entry as { close: number }).close;
  return null;
}

interface StockChartProps {
  symbol: string;
  period: string;
  compact?: boolean;
}

export default function StockChart({ symbol, period, compact = false }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeMeasure, setRangeMeasure] = useState<RangeMeasure | null>(null);
  const [hasAnchor, setHasAnchor] = useState(false);
  const anchorRef = useRef<{ time: ChartTime; value: number } | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stocks?action=history&symbol=${encodeURIComponent(symbol)}&period=${period}`
        );
        if (res.ok) {
          const result = await res.json();
          setData(result.points ?? result);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    if (symbol) fetchData();
  }, [symbol, period]);

  const renderChart = useCallback(async () => {
    if (!chartContainerRef.current || data.length === 0) return;

    const container = chartContainerRef.current;

    const {
      createChart,
      ColorType,
      CrosshairMode,
      LineSeries,
      CandlestickSeries,
      HistogramSeries,
    } = await import("lightweight-charts");

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chartHeight = compact ? 200 : 500;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: chartHeight,
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
      },
      timeScale: {
        borderColor: "#2d333b",
        timeVisible: period === "1D" || period === "5D",
      },
    });

    chartRef.current = chart;

    const isIntraday = period === "1D" || period === "5D";

    if (isIntraday) {
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
          time: d.time as string,
          value: d.close,
        })) as Parameters<typeof lineSeries.setData>[0]
      );
    } else {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#dc2626",
        borderUpColor: "#10b981",
        borderDownColor: "#dc2626",
        wickUpColor: "#10b981",
        wickDownColor: "#dc2626",
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });

      candleSeries.setData(
        data.map((d) => ({
          time: d.time as string,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })) as Parameters<typeof candleSeries.setData>[0]
      );
    }

    if (!compact) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#c9a22740",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });

      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      volumeSeries.setData(
        data.map((d) => ({
          time: d.time as string,
          value: d.volume,
          color: d.close >= d.open ? "#10b98140" : "#dc262640",
        })) as Parameters<typeof volumeSeries.setData>[0]
      );
    }

    if (compact) {
      chart.applyOptions({
        handleScroll: false,
        handleScale: false,
        timeScale: { visible: false, borderColor: "#2d333b" },
        rightPriceScale: { visible: false, borderColor: "#2d333b" },
        crosshair: {
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
      });
    }

    if (!compact) {
      const computeMeasure = (
        anchor: { time: ChartTime; value: number },
        toTime: ChartTime,
        toValue: number
      ): RangeMeasure => {
        const dollarChange = toValue - anchor.value;
        const pctChange =
          anchor.value !== 0 ? (dollarChange / anchor.value) * 100 : 0;
        return {
          fromTime: anchor.time,
          toTime,
          fromValue: anchor.value,
          toValue,
          pctChange,
          dollarChange,
        };
      };

      const unsubHover = chart.subscribeCrosshairMove((param) => {
        if (!param.time || !anchorRef.current || param.seriesData.size === 0) return;
        const price = getCloseFromSeriesData(
          param.seriesData as ReadonlyMap<unknown, unknown>
        );
        if (price === null) return;
        setRangeMeasure(computeMeasure(anchorRef.current, param.time as ChartTime, price));
      });

      const unsubClick = chart.subscribeClick((param) => {
        if (!param.time || param.seriesData.size === 0) {
          anchorRef.current = null;
          setHasAnchor(false);
          setRangeMeasure(null);
          return;
        }
        const price = getCloseFromSeriesData(
          param.seriesData as ReadonlyMap<unknown, unknown>
        );
        if (price === null) return;

        if (!anchorRef.current) {
          anchorRef.current = { time: param.time as ChartTime, value: price };
          setHasAnchor(true);
          setRangeMeasure(null);
        } else {
          setRangeMeasure(
            computeMeasure(anchorRef.current, param.time as ChartTime, price)
          );
          anchorRef.current = null;
          setHasAnchor(false);
        }
      });

      (container as HTMLDivElement & {
        __unsubHover?: () => void;
        __unsubClick?: () => void;
      }).__unsubHover = unsubHover;
      (container as HTMLDivElement & {
        __unsubHover?: () => void;
        __unsubClick?: () => void;
      }).__unsubClick = unsubClick;
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.applyOptions({
          width: container.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      const c = container as HTMLDivElement & {
        __unsubHover?: () => void;
        __unsubClick?: () => void;
      };
      c.__unsubHover?.();
      c.__unsubClick?.();
    };
  }, [data, period, compact]);

  useEffect(() => {
    renderChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [renderChart]);

  const containerHeight = compact ? "h-[200px]" : "h-[500px]";

  if (loading) {
    return (
      <div className={`${containerHeight} rounded-xl bg-card border border-border flex items-center justify-center`}>
        <div className="text-muted text-sm">Loading chart data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${containerHeight} rounded-xl bg-card border border-border flex items-center justify-center`}>
        <div className="text-muted text-sm">
          No data available for this period
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border">
      <div ref={chartContainerRef} className="w-full" />

      {(hasAnchor || rangeMeasure) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm whitespace-nowrap pointer-events-auto">
          {hasAnchor && !rangeMeasure && (
            <span className="text-muted">Click another point to measure</span>
          )}
          {rangeMeasure && (
            <>
              <span className="font-mono text-muted">
                {formatRangeTime(rangeMeasure.fromTime)}
              </span>
              <span className="text-muted">→</span>
              <span className="font-mono text-muted">
                {formatRangeTime(rangeMeasure.toTime)}
              </span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  rangeMeasure.pctChange >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {rangeMeasure.pctChange >= 0 ? "+" : ""}
                {rangeMeasure.pctChange.toFixed(2)}%
              </span>
              <span
                className={`font-mono tabular-nums ${
                  rangeMeasure.dollarChange >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ({rangeMeasure.dollarChange >= 0 ? "+" : "-"}$
                {Math.abs(rangeMeasure.dollarChange).toFixed(2)})
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              anchorRef.current = null;
              setHasAnchor(false);
              setRangeMeasure(null);
            }}
            className="ml-1 rounded p-0.5 text-muted transition-colors hover:text-foreground cursor-pointer"
            aria-label="Clear measurement"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {!compact && (
        <Link
          href={`/stocks?symbol=${encodeURIComponent(symbol)}&tab=${encodeURIComponent("Historical Price")}`}
          className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/80 px-2 py-1 text-[11px] text-muted backdrop-blur-sm transition-colors hover:text-accent"
          aria-label={`Open ${symbol} historical price chart`}
        >
          Full chart
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

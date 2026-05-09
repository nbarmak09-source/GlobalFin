"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import type { HistoricalDataPoint } from "@/lib/types";
import type { MouseEventParams } from "lightweight-charts";

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

function dataPointTimeMs(t: string | number): number {
  if (typeof t === "number") return t * 1000;
  if (typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return new Date(`${t}T12:00:00Z`).getTime();
  }
  return new Date(t).getTime();
}

function chartTimeToMs(ct: ChartTime): number {
  if (typeof ct === "number") return ct * 1000;
  if (typeof ct === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(ct)) return new Date(`${ct}T12:00:00Z`).getTime();
    return new Date(ct).getTime();
  }
  return Date.UTC(ct.year, ct.month - 1, ct.day);
}

/** Close prices on each bar between the two endpoints (inclusive), in time order — traces the displayed series. */
function buildClosePathAlongBars(
  hist: HistoricalDataPoint[],
  endA: ChartTime,
  endB: ChartTime
): { time: string | number; value: number }[] {
  const lo = Math.min(chartTimeToMs(endA), chartTimeToMs(endB));
  const hi = Math.max(chartTimeToMs(endA), chartTimeToMs(endB));

  return hist
    .filter((p) => {
      const t = dataPointTimeMs(p.time);
      return t >= lo && t <= hi;
    })
    .sort((a, b) => dataPointTimeMs(a.time) - dataPointTimeMs(b.time))
    .map((p) => ({ time: p.time, value: p.close }));
}

export type StockChartStyle = "candles" | "line" | "area";

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
  const [chartStyle, setChartStyle] = useState<StockChartStyle>("candles");
  const [rangeMeasure, setRangeMeasure] = useState<RangeMeasure | null>(null);
  const [hasAnchor, setHasAnchor] = useState(false);
  const anchorRef = useRef<{ time: ChartTime; value: number } | null>(null);
  const previewEndRef = useRef<{ time: ChartTime; value: number } | null>(null);
  const rangeMeasureRef = useRef<RangeMeasure | null>(null);
  const measureOverlayUpdateRef = useRef<(() => void) | null>(null);
  /** Defer overlay setData — synchronous setData inside subscribeCrosshairMove re-triggers crosshair and overflows the stack */
  const measureOverlayRafRef = useRef<number | null>(null);

  useEffect(() => {
    rangeMeasureRef.current = rangeMeasure;
  }, [rangeMeasure]);

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
      LineStyle,
      AreaSeries,
      CandlestickSeries,
      HistogramSeries,
    } = await import("lightweight-charts");

    measureOverlayUpdateRef.current = null;
    if (measureOverlayRafRef.current !== null) {
      cancelAnimationFrame(measureOverlayRafRef.current);
      measureOverlayRafRef.current = null;
    }

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

    const priceFormat = {
      type: "price" as const,
      precision: 2,
      minMove: 0.01,
    };

    const candleInput = data.map((d) => ({
      time: d.time as string,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const singleValueInput = data.map((d) => ({
      time: d.time as string,
      value: d.close,
    }));

    if (chartStyle === "candles") {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#dc2626",
        borderUpColor: "#10b981",
        borderDownColor: "#dc2626",
        wickUpColor: "#10b981",
        wickDownColor: "#dc2626",
        priceFormat,
      });
      candleSeries.setData(
        candleInput as Parameters<typeof candleSeries.setData>[0]
      );
    } else if (chartStyle === "area") {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#c9a227",
        topColor: "rgba(201, 162, 39, 0.32)",
        bottomColor: "rgba(201, 162, 39, 0)",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceFormat,
      });
      areaSeries.setData(
        singleValueInput as Parameters<typeof areaSeries.setData>[0]
      );
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#c9a227",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceFormat,
      });
      lineSeries.setData(
        singleValueInput as Parameters<typeof lineSeries.setData>[0]
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

      const measureOverlaySeries = chart.addSeries(LineSeries, {
        color: "rgba(147, 197, 253, 0.98)",
        lineWidth: 2,
        lineStyle: LineStyle.LargeDashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });
      measureOverlaySeries.setData([]);

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

      const applyMeasureOverlay = () => {
        const locked = rangeMeasureRef.current;
        const anchor = anchorRef.current;
        const preview = previewEndRef.current;

        let tA: ChartTime | null = null;
        let tB: ChartTime | null = null;

        if (anchor && preview) {
          tA = anchor.time;
          tB = preview.time;
        } else if (locked) {
          tA = locked.fromTime;
          tB = locked.toTime;
        }

        if (tA !== null && tB !== null) {
          const path = buildClosePathAlongBars(data, tA, tB);
          measureOverlaySeries.setData(
            path as Parameters<typeof measureOverlaySeries.setData>[0]
          );
        } else {
          measureOverlaySeries.setData([]);
        }
      };

      measureOverlayUpdateRef.current = applyMeasureOverlay;

      const scheduleMeasureOverlayFromCrosshair = () => {
        if (measureOverlayRafRef.current !== null) {
          cancelAnimationFrame(measureOverlayRafRef.current);
        }
        measureOverlayRafRef.current = requestAnimationFrame(() => {
          measureOverlayRafRef.current = null;
          applyMeasureOverlay();
        });
      };

      const onCrosshairMove = (param: MouseEventParams) => {
        if (!param.time || !anchorRef.current || param.seriesData.size === 0) return;
        const price = getCloseFromSeriesData(
          param.seriesData as ReadonlyMap<unknown, unknown>
        );
        if (price === null) return;
        previewEndRef.current = { time: param.time as ChartTime, value: price };
        setRangeMeasure(computeMeasure(anchorRef.current, param.time as ChartTime, price));
        scheduleMeasureOverlayFromCrosshair();
      };

      const onChartClick = (param: MouseEventParams) => {
        if (!param.time || param.seriesData.size === 0) {
          anchorRef.current = null;
          previewEndRef.current = null;
          rangeMeasureRef.current = null;
          setHasAnchor(false);
          setRangeMeasure(null);
          applyMeasureOverlay();
          return;
        }
        const price = getCloseFromSeriesData(
          param.seriesData as ReadonlyMap<unknown, unknown>
        );
        if (price === null) return;

        if (!anchorRef.current) {
          rangeMeasureRef.current = null;
          anchorRef.current = { time: param.time as ChartTime, value: price };
          previewEndRef.current = null;
          setHasAnchor(true);
          setRangeMeasure(null);
          applyMeasureOverlay();
        } else {
          const locked = computeMeasure(
            anchorRef.current,
            param.time as ChartTime,
            price
          );
          rangeMeasureRef.current = locked;
          setRangeMeasure(locked);
          anchorRef.current = null;
          previewEndRef.current = null;
          setHasAnchor(false);
          applyMeasureOverlay();
        }
      };

      chart.subscribeCrosshairMove(onCrosshairMove);
      chart.subscribeClick(onChartClick);
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

    chart.timeScale().fitContent();

    queueMicrotask(() => {
      measureOverlayUpdateRef.current?.();
    });

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
    };
  }, [data, period, compact, chartStyle]);

  useEffect(() => {
    renderChart();
    return () => {
      if (measureOverlayRafRef.current !== null) {
        cancelAnimationFrame(measureOverlayRafRef.current);
        measureOverlayRafRef.current = null;
      }
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

      {!compact && (
        <div
          className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card/90 px-1 py-1 shadow-sm backdrop-blur-sm"
          role="group"
          aria-label="Chart style"
        >
          {(
            [
              ["candles", "Candles"],
              ["line", "Line"],
              ["area", "Area"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setChartStyle(id)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                chartStyle === id
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
              previewEndRef.current = null;
              rangeMeasureRef.current = null;
              setHasAnchor(false);
              setRangeMeasure(null);
              measureOverlayUpdateRef.current?.();
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

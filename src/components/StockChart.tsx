"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HistoricalDataPoint } from "@/lib/types";

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

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
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

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
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
    <div
      ref={chartContainerRef}
      className="rounded-xl overflow-hidden border border-border"
    />
  );
}

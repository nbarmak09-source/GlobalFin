"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";

type Point = { date: string; value: number };

type ApiResponse = {
  period: string;
  series: {
    tenYear: { label: string; data: Point[] };
    twoYear: { label: string; data: Point[] };
  };
  sourceUrl?: string;
  error?: string;
};

const PERIODS = ["1Y", "2Y", "5Y", "10Y", "20Y", "MAX"] as const;
type Period = (typeof PERIODS)[number];

const COLOR_10Y = "#c9a227";
const COLOR_2Y = "#14b8a6";

export default function Treasury10y2yChart() {
  const [json, setJson] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("5Y");
  const [error, setError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<
    typeof import("lightweight-charts").createChart
  > | null>(null);

  const fetchData = useCallback(async () => {
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/fixed-income/treasury-10y-2y?period=${period}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const data: ApiResponse = await res.json();
      if (data.error || !data.series) throw new Error();
      setJson(data);
    } catch {
      setError(true);
      setJson(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderChart = useCallback(async () => {
    if (!containerRef.current || !json?.series) return;
    const ten = json.series.tenYear.data;
    const two = json.series.twoYear.data;
    if (ten.length < 2 || two.length < 2) return;

    const container = containerRef.current;
    const width = Math.max(container.clientWidth || 300, 200);

    const { createChart, ColorType, CrosshairMode, LineSeries } =
      await import("lightweight-charts");

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(container, {
      width,
      height: Math.max(container.clientHeight, 1),
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
        scaleMargins: { top: 0.12, bottom: 0.08 },
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

    const s10 = chart.addSeries(LineSeries, {
      color: COLOR_10Y,
      lineWidth: 2,
      title: "10Y",
    });
    const s2 = chart.addSeries(LineSeries, {
      color: COLOR_2Y,
      lineWidth: 2,
      title: "2Y",
    });

    s10.setData(
      ten.map((d) => ({ time: d.date, value: d.value })) as Parameters<
        typeof s10.setData
      >[0]
    );
    s2.setData(
      two.map((d) => ({ time: d.date, value: d.value })) as Parameters<
        typeof s2.setData
      >[0]
    );

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        const el = containerRef.current;
        chartRef.current.applyOptions({
          width: Math.max(el.clientWidth || 300, 200),
          height: Math.max(el.clientHeight, 1),
        });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, [json]);

  useEffect(() => {
    if (loading || error || !json) return;
    let cleanup: (() => void) | undefined;
    void renderChart().then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [loading, error, json, renderChart]);

  if (error) {
    return (
      <div className="rounded-xl bg-card border border-border p-5 text-center text-sm text-muted">
        Historical spread data is currently unavailable. The yield curve snapshot
        above reflects today&apos;s rates from the US Treasury.
      </div>
    );
  }

  const last10 = json?.series?.tenYear.data.at(-1);
  const last2 = json?.series?.twoYear.data.at(-1);
  /** Yield difference in percentage points; ×100 for basis points. */
  const spreadPp =
    last10 && last2 ? last10.value - last2.value : null;
  const spreadBps = spreadPp !== null ? spreadPp * 100 : null;
  const inverted = spreadPp !== null && spreadPp < 0;

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden shadow-lg shadow-black/20">
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="flex items-center gap-2"
          style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}
        >
          <Activity className="h-3.5 w-3.5 text-accent shrink-0" />
          <div>
            <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted block">
              10Y vs 2Y Treasury (recession watch)
            </span>
            <span className="text-[11px] text-muted opacity-80">
              When 2Y is above 10Y, the curve is inverted — often cited ahead of
              recessions. Daily constant-maturity yields (FRED: DGS10, DGS2).
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {spreadBps !== null && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted">
                10Y − 2Y spread
              </div>
              <div
                className={`text-lg font-mono font-medium tabular-nums leading-none ${
                  inverted ? "text-red" : "text-green"
                }`}
              >
                {spreadBps >= 0 ? "+" : ""}
                {spreadBps.toFixed(0)} bps
              </div>
              <div className="text-[10px] text-muted font-mono">
                {spreadPp !== null && (
                  <>
                    ({spreadPp >= 0 ? "+" : ""}
                    {spreadPp.toFixed(2)} pp)
                  </>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
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
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 pt-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-4 rounded-sm"
            style={{ background: COLOR_10Y }}
          />
          10-year
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-4 rounded-sm"
            style={{ background: COLOR_2Y }}
          />
          2-year
        </span>
        {json?.sourceUrl && (
          <a
            href={json.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-accent hover:underline text-[11px]"
          >
            FRED®
          </a>
        )}
      </div>

      <div className="px-2 pb-3 pt-1 relative h-[220px]">
        {loading && (
          <div
            className="absolute inset-x-2 inset-y-1 z-10 rounded-lg bg-border/40 animate-pulse pointer-events-none"
            aria-hidden
          />
        )}
        <div ref={containerRef} className="h-full w-full min-h-[220px]" />
      </div>
    </div>
  );
}

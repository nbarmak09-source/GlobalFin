"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getTradingViewSymbol,
  type TradingViewSymbolOptions,
} from "@/lib/tradingview";

interface TradingViewChartProps {
  symbol: string;
  /** Fixed pixel height (default when not using `fill`). */
  height?: number;
  /** Grow to fill the parent; parent should be a flex child with a defined height (e.g. `flex-1 min-h-0`). */
  fill?: boolean;
  interval?: string;
  /** From Yahoo quote / summary — fixes wrong exchange (e.g. NASDAQ vs NYSE) for TradingView */
  yahooExchange?: string;
  yahooExchangeName?: string;
}

export default function TradingViewChart({
  symbol,
  height = 500,
  fill = false,
  interval = "D",
  yahooExchange,
  yahooExchangeName,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  /** Pixel size for fill mode — both axes so the iframe matches the grid cell (fixes narrow embed). */
  const [fillDims, setFillDims] = useState({ w: 0, h: 400 });

  const tvOpts = useMemo<TradingViewSymbolOptions | undefined>(
    () =>
      yahooExchange || yahooExchangeName
        ? { yahooExchange, yahooExchangeName }
        : undefined,
    [yahooExchange, yahooExchangeName]
  );

  const resolvedHeight = fill ? fillDims.h : height;

  useLayoutEffect(() => {
    if (!fill || !chartAreaRef.current) return;
    const r = chartAreaRef.current.getBoundingClientRect();
    const w = Math.floor(r.width);
    const h = Math.floor(r.height);
    if (w > 0 && h > 0) setFillDims({ w, h });
  }, [fill]);

  useEffect(() => {
    if (!fill) return;
    const el = chartAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      if (w > 0 && h > 0) setFillDims({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  useEffect(() => {
    if (!symbol || !containerRef.current) return;

    const tvSymbol = getTradingViewSymbol(symbol, tvOpts);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: "America/New_York",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.innerHTML = "";
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    const container = containerRef.current;
    return () => {
      script.remove();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [symbol, resolvedHeight, interval, tvOpts, fill, fillDims.w]);

  const openHref = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
    getTradingViewSymbol(symbol, tvOpts)
  )}`;

  return (
    <div
      ref={wrapperRef}
      className={`rounded-xl overflow-hidden border border-border w-full min-w-0 flex flex-col min-h-0 ${fill ? "h-full" : ""}`}
    >
      <div
        ref={chartAreaRef}
        className={fill ? "flex-1 min-h-0 w-full min-w-0" : undefined}
      >
        <div
          ref={containerRef}
          className="tradingview-widget-container w-full max-w-full"
          style={
            fill && fillDims.w > 0
              ? { height: `${fillDims.h}px`, width: `${fillDims.w}px`, maxWidth: "100%" }
              : { height: `${resolvedHeight}px`, width: "100%" }
          }
        />
      </div>
      <div className="shrink-0 px-3 py-1.5 border-t border-border bg-card-hover/30 flex items-center justify-between text-xs text-muted">
        <span>Live chart powered by TradingView</span>
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Open in TradingView →
        </a>
      </div>
    </div>
  );
}

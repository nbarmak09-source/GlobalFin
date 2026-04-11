"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  getTradingViewSymbol,
  type TradingViewSymbolOptions,
} from "@/lib/tradingview";

interface TradingViewChartProps {
  symbol: string;
  height?: number;
  interval?: string;
  /** From Yahoo quote / summary — fixes wrong exchange (e.g. NASDAQ vs NYSE) for TradingView */
  yahooExchange?: string;
  yahooExchangeName?: string;
}

export default function TradingViewChart({
  symbol,
  height = 500,
  interval = "D",
  yahooExchange,
  yahooExchangeName,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const tvOpts = useMemo<TradingViewSymbolOptions | undefined>(
    () =>
      yahooExchange || yahooExchangeName
        ? { yahooExchange, yahooExchangeName }
        : undefined,
    [yahooExchange, yahooExchangeName]
  );

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
  }, [symbol, height, interval, tvOpts]);

  const openHref = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
    getTradingViewSymbol(symbol, tvOpts)
  )}`;

  return (
    <div ref={wrapperRef} className="rounded-xl overflow-hidden border border-border w-full min-w-0">
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full"
        style={{ height: `${height}px`, width: "100%" }}
      />
      <div className="px-3 py-1.5 border-t border-border bg-card-hover/30 flex items-center justify-between text-xs text-muted">
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

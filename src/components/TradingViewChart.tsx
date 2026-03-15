"use client";

import { useEffect, useRef, useState } from "react";

const NASDAQ_SYMBOLS = new Set([
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "AMD",
  "ADBE", "INTC", "CSCO", "AVGO", "NFLX", "PEP", "CMCSA", "COST", "QCOM",
  "TMUS", "INTU", "AMGN", "AMAT", "HON", "SBUX", "VRTX", "GILD", "BKNG",
  "LRCX", "ADP", "PANW", "REGN", "MDLZ", "ISRG", "SNPS", "KLAC", "CDNS",
  "MAR", "ORLY", "ABNB", "DXCM", "ASML", "FTNT", "CHTR", "MNST", "MRVL",
  "ADSK", "KDP", "PCAR", "PAYX", "AEP", "KHC", "CDW", "CTAS", "EXC",
  "FANG", "MELI", "CTSH", "XEL", "FAST", "WDAY", "EA", "IDXX", "BKR",
]);

function getTradingViewSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.startsWith("^")) {
    if (upper === "^GSPC") return "SP:SPX";
    if (upper === "^DJI") return "DJ:DJI";
    if (upper === "^IXIC") return "NASDAQ:NDX";
    if (upper === "^RUT") return "TVC:RUT";
    if (upper === "^GSPTSE") return "TSX:OSPTX";
  }
  if (NASDAQ_SYMBOLS.has(upper)) return `NASDAQ:${upper}`;
  return `NYSE:${upper}`;
}

interface TradingViewChartProps {
  symbol: string;
  height?: number;
  interval?: string;
}

export default function TradingViewChart({
  symbol,
  height = 500,
  interval = "D",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!symbol || !containerRef.current) return;

    const tvSymbol = getTradingViewSymbol(symbol);

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
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      script.remove();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, height, interval, containerWidth]);

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
          href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(getTradingViewSymbol(symbol))}`}
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

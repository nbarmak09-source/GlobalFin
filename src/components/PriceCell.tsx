"use client";

import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/app/api/quotes/route";

interface PriceCellProps {
  quote: Quote | undefined;
  /** Show the ticker symbol above the price. Default: false */
  showSymbol?: boolean;
  /** Show the company short name. Default: false */
  showName?: boolean;
  /** Number of decimal places. Default: 2 */
  decimals?: number;
  className?: string;
}

type FlashDirection = "up" | "down" | null;

/**
 * Renders a single quote with a subtle flash when the price moves up or down.
 */
export function PriceCell({
  quote,
  showSymbol = false,
  showName = false,
  decimals = 2,
  className = "",
}: PriceCellProps) {
  const prevPriceRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<FlashDirection>(null);

  useEffect(() => {
    if (!quote?.price) {
      prevPriceRef.current = null;
      return;
    }

    const p = quote.price;
    const prev = prevPriceRef.current;
    let flashClear: ReturnType<typeof setTimeout> | undefined;

    const raf = requestAnimationFrame(() => {
      if (prev !== null && prev !== p) {
        setFlash(p > prev ? "up" : "down");
        flashClear = setTimeout(() => setFlash(null), 800);
      }
    });

    prevPriceRef.current = p;

    return () => {
      cancelAnimationFrame(raf);
      if (flashClear !== undefined) clearTimeout(flashClear);
    };
  }, [quote?.price]);

  if (!quote) {
    return (
      <span
        className={`price-cell price-cell--skeleton ${className}`}
        aria-busy="true"
      >
        <span className="price-cell__price">——</span>
      </span>
    );
  }

  const { price, change, changePercent, name, symbol, marketState } = quote;

  const isPositive = (change ?? 0) >= 0;
  const changeColor = isPositive
    ? "price-cell__change--up"
    : "price-cell__change--down";
  const arrow = isPositive ? "▲" : "▼";
  const isAfterHours = marketState && marketState !== "REGULAR";

  return (
    <span
      className={`price-cell ${flash ? `price-cell--flash-${flash}` : ""} ${className}`}
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${symbol ?? ""} price ${price != null ? price.toFixed(decimals) : "unavailable"}`}
    >
      {showSymbol && symbol && (
        <span className="price-cell__symbol">{symbol}</span>
      )}
      {showName && name && <span className="price-cell__name">{name}</span>}

      <span className="price-cell__price">
        {price != null ? price.toFixed(decimals) : "—"}
        {isAfterHours && (
          <span
            className="price-cell__market-state"
            title={`Market: ${marketState}`}
          >
            &#8226;
          </span>
        )}
      </span>

      {change != null && changePercent != null && (
        <span className={`price-cell__change ${changeColor}`}>
          <span className="price-cell__arrow" aria-hidden="true">
            {arrow}
          </span>
          {Math.abs(change).toFixed(decimals)}
          <span className="price-cell__pct">
            ({Math.abs(changePercent).toFixed(2)}%)
          </span>
        </span>
      )}
    </span>
  );
}

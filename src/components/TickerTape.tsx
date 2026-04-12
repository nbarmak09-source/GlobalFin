"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TickerItem } from "@/lib/types";
import { getSupplyChainByTicker } from "@/lib/supplyChainLookup";

function isSupplyChainTapePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/supply-chain" || pathname.startsWith("/supply-chain/")
  );
}

/** Auto-scroll speed (px/s). Lower = slower. */
const SCROLL_PX_PER_SEC = 45;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  JPY: "¥",
  GBP: "£",
  CNY: "CN¥",
  CAD: "C$",
};

function fmtCurrency(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency + " ";
  return `${sym}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TickerTape() {
  const pathname = usePathname();
  const supplyChainMode = isSupplyChainTapePath(pathname);

  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);

  async function fetchTicker() {
    try {
      const res = await fetch("/api/stocks?action=ticker", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTicker();
    const interval = setInterval(fetchTicker, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute animation duration so the strip scrolls at exactly SCROLL_PX_PER_SEC.
  // The inner row is duplicated (2× items); translateX(-50%) covers half the width.
  useLayoutEffect(() => {
    if (!rowRef.current || items.length === 0) return;
    const distance = rowRef.current.scrollWidth / 2;
    if (distance > 0) {
      const duration = Math.round(distance / SCROLL_PX_PER_SEC);
      rowRef.current.style.setProperty("--ticker-duration", `${duration}s`);
    }
  }, [items]);

  if (loading) {
    return (
      <div className="h-10 bg-card border-b border-border flex items-center justify-center">
        <div className="text-muted text-xs">Loading market data...</div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const duplicated = [...items, ...items];

  return (
    <div
      data-gcm-ticker
      className="h-10 bg-card border-b border-border overflow-hidden select-none"
    >
      <div
        ref={rowRef}
        className="ticker-animate flex h-full items-center whitespace-nowrap w-max"
      >
        {duplicated.map((item, idx) => {
          const sc = supplyChainMode
            ? getSupplyChainByTicker(item.symbol)
            : undefined;
          const href = `/stocks?symbol=${encodeURIComponent(item.symbol)}`;
          const title =
            supplyChainMode && sc
              ? `Layer ${sc.layerId} — ${sc.layerName}`
              : undefined;
          return (
            <Link
              key={`${item.symbol}-${idx}`}
              href={href}
              prefetch={false}
              draggable={false}
              title={title}
              aria-label={`Open ${item.name} (${item.symbol})`}
              className="inline-flex items-center gap-2 px-4 border-r border-border/50 shrink-0 text-inherit no-underline transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {supplyChainMode ? (
                <>
                  {sc && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: sc.dotColor }}
                      aria-hidden
                    />
                  )}
                  <span className="text-xs font-mono font-semibold text-foreground/90">
                    {item.symbol}
                  </span>
                  <span className="text-xs font-[500] text-foreground">
                    {item.name}
                  </span>
                </>
              ) : (
                <span className="text-xs font-[500] text-foreground">
                  {item.name}
                </span>
              )}
              <span className="text-xs font-mono text-foreground/60">
                {fmtCurrency(item.priceUSD, "USD")}
              </span>
              {item.currency !== "USD" && (
                <span className="text-[10px] font-mono text-muted">
                  {fmtCurrency(item.price, item.currency)}
                </span>
              )}
              <span
                className={`text-xs font-mono font-medium ${
                  item.change >= 0 ? "text-green" : "text-red"
                }`}
              >
                {item.changePercent >= 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

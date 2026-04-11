"use client";

import { useEffect, useState, useRef } from "react";
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

/** Auto-scroll speed (matches ~120s per full loop for a very wide strip). */
const SCROLL_PX_PER_SEC = 95;

/** Pixels of horizontal movement before a pointer gesture counts as a drag (suppress link click). */
const DRAG_THRESHOLD_PX = 6;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const pointerMovedPastThreshold = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  function handleMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return;
    isDown.current = true;
    pointerMovedPastThreshold.current = false;
    setIsDragging(true);
    startX.current = e.pageX;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
  }

  function handleMouseLeave() {
    isDown.current = false;
    setIsDragging(false);
    setIsHovering(false);
  }

  function handleMouseUp() {
    isDown.current = false;
    setIsDragging(false);
  }

  function handleMouseEnter() {
    setIsHovering(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isDown.current && scrollRef.current) {
      e.preventDefault();
      if (Math.abs(e.pageX - startX.current) > DRAG_THRESHOLD_PX) {
        pointerMovedPastThreshold.current = true;
      }
      const walk = (e.pageX - startX.current) * 1.5;
      scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
    }
  }

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
    const interval = setInterval(fetchTicker, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onGlobalMouseUp() {
      isDown.current = false;
      setIsDragging(false);
    }
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, []);

  useEffect(() => {
    if (!scrollRef.current || isHovering || isDragging) return;

    let rafId: number;
    let last = performance.now();

    function tick(now: number) {
      const el = scrollRef.current;
      if (!el) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const halfWidth = el.scrollWidth / 2;
      if (halfWidth <= 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      el.scrollLeft += SCROLL_PX_PER_SEC * dt;
      if (el.scrollLeft >= halfWidth) {
        el.scrollLeft = 0;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [items, isHovering, isDragging]);

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
      ref={scrollRef}
      className={`h-10 bg-card border-b border-border overflow-x-auto overflow-y-hidden select-none ticker-scrollbar-hide ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div className="flex h-full items-center whitespace-nowrap min-w-max">
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
              onClick={(e) => {
                if (pointerMovedPastThreshold.current) {
                  e.preventDefault();
                }
              }}
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

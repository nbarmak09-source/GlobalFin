"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import type { TickerItem } from "@/lib/types";
import { getSupplyChainByTicker } from "@/lib/supplyChainLookup";

function isSupplyChainTapePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/supply-chain" || pathname.startsWith("/supply-chain/")
  );
}

const SCROLL_SPEED = 0.5; // pixels per frame (~30px/sec)

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
  const scrollLeft = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  function handleMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return;
    isDown.current = true;
    setIsDragging(true);
    startX.current = e.pageX;
    scrollLeft.current = scrollRef.current.scrollLeft;
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
      const walk = (e.pageX - startX.current) * 1.5;
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
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
    function tick() {
      const current = scrollRef.current;
      if (!current) return;
      const halfWidth = current.scrollWidth / 2;
      current.scrollLeft += SCROLL_SPEED;
      if (current.scrollLeft >= halfWidth) {
        current.scrollLeft = 0;
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
          return (
            <div
              key={`${item.symbol}-${idx}`}
              className="inline-flex items-center gap-2 px-4 border-r border-border/50"
              title={
                supplyChainMode && sc
                  ? `Layer ${sc.layerId} — ${sc.layerName}`
                  : undefined
              }
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
                {fmtCurrency(item.price, item.currency)}
              </span>
              {item.currency !== "USD" && (
                <span className="text-[10px] font-mono text-muted">
                  ${item.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

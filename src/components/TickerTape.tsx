"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TickerItem } from "@/lib/types";
import { getSupplyChainByTicker } from "@/lib/supplyChainLookup";

function isSupplyChainTapePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/supply-chain" || pathname.startsWith("/supply-chain/");
}

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

/** 1px vertical separator between ticker items */
function Sep() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 1,
        height: 12,
        background: "rgba(255,255,255,0.12)",
        margin: "0 4px",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    />
  );
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

  useLayoutEffect(() => {
    if (!rowRef.current || items.length === 0) return;
    const distance = rowRef.current.scrollWidth / 2;
    if (distance > 0) {
      const duration = Math.round(distance / SCROLL_PX_PER_SEC);
      rowRef.current.style.setProperty("--ticker-duration", `${duration}s`);
    }
  }, [items]);

  const containerStyle: React.CSSProperties = {
    background: "var(--color-surface)",
    borderBottom: "1px solid var(--color-border)",
  };

  if (loading) {
    return (
      <div
        data-gcm-ticker
        className="h-9 md:h-10 overflow-x-hidden flex items-center justify-center"
        style={containerStyle}
      >
        <div style={{ color: "var(--color-muted)", fontSize: 11 }}>
          Loading market data…
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-gcm-ticker
        className="h-9 md:h-10 overflow-x-hidden flex items-center justify-center px-3 gap-2"
        style={containerStyle}
      >
        <span style={{ color: "var(--color-muted)", fontSize: 11, textAlign: "center" }}>
          No live quotes yet (retrying every 15 s). Check{" "}
          <Link
            href="/account"
            style={{ color: "var(--color-primary)" }}
            className="hover:underline"
          >
            Account
          </Link>{" "}
          for tape settings.
        </span>
      </div>
    );
  }

  const duplicated = [...items, ...items];

  return (
    <div
      data-gcm-ticker
      className="h-9 md:h-10 overflow-x-hidden overflow-y-hidden select-none scrollbar-hide"
      style={containerStyle}
    >
      <div
        ref={rowRef}
        className="ticker-animate flex h-full touch-pan-x items-center whitespace-nowrap w-max"
      >
        {/* Live dot — shown once before the first item */}
        <span
          className="pulse-gold shrink-0"
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-primary)",
            marginLeft: 12,
            marginRight: 10,
          }}
          aria-label="Live"
        />

        {duplicated.map((item, idx) => {
          const sc = supplyChainMode
            ? getSupplyChainByTicker(item.symbol)
            : undefined;
          const href = `/stocks?symbol=${encodeURIComponent(item.symbol)}`;
          const title =
            supplyChainMode && sc
              ? `Layer ${sc.layerId} — ${sc.layerName}`
              : undefined;
          const isPositive = item.changePercent >= 0;

          return (
            <span key={`${item.symbol}-${idx}`} className="inline-flex items-center">
              <Link
                href={href}
                prefetch={false}
                draggable={false}
                title={title}
                aria-label={`Open ${item.name} (${item.symbol})`}
                className="inline-flex items-center gap-1.5 px-3 shrink-0 no-underline transition-opacity hover:opacity-80 focus-visible:outline-none"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 12,
                }}
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
                    <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      {item.symbol}
                    </span>
                    <span style={{ color: "var(--color-muted)" }}>{item.name}</span>
                  </>
                ) : (
                  <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                    {item.name}
                  </span>
                )}

                <span style={{ color: "var(--color-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtCurrency(item.priceUSD, "USD")}
                </span>

                {item.currency !== "USD" && (
                  <span style={{ color: "var(--color-muted)", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
                    {fmtCurrency(item.price, item.currency)}
                  </span>
                )}

                <span
                  style={{
                    color: isPositive ? "#4ade80" : "#f87171",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {isPositive ? "▲" : "▼"}{Math.abs(item.changePercent).toFixed(2)}%
                </span>
              </Link>
              <Sep />
            </span>
          );
        })}
      </div>
    </div>
  );
}

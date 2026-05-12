"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

interface SymbolSparklineProps {
  symbol: string;
  /** Fallback trend when fewer than two closes (e.g. still loading). */
  trendPositive: boolean;
  className?: string;
  /** SVG render width in px. Scales via viewBox — defaults to 56. */
  width?: number;
}

const MAX_POINTS = 48;

/** Dedupe concurrent + repeat visits for the same symbol (dashboard lists). */
const closesCache = new Map<string, number[]>();
const inflight = new Map<string, Promise<number[]>>();

async function fetch5dCloses(symbol: string): Promise<number[]> {
  const key = `${symbol}|5D`;
  const cached = closesCache.get(key);
  if (cached) return cached;

  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(
          `/api/stocks?action=history&symbol=${encodeURIComponent(symbol)}&period=5D`
        );
        if (!res.ok) return [];
        const json = (await res.json()) as { points?: { close: number }[] };
        const pts = json.points ?? [];
        if (!Array.isArray(pts) || pts.length < 2) return [];
        const raw = pts
          .map((x) => x.close)
          .filter((n) => typeof n === "number" && Number.isFinite(n));
        if (raw.length < 2) return [];
        const sampled =
          raw.length <= MAX_POINTS
            ? raw
            : raw.filter((_, i) => i % Math.ceil(raw.length / MAX_POINTS) === 0);
        const closes = sampled.length >= 2 ? sampled : raw;
        closesCache.set(key, closes);
        return closes;
      } catch {
        return [];
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
  }
  return p;
}

/** Avoid setState during the synchronous observe() callback / layout flush (DEV Fast Refresh races). */
function scheduleIdle(cb: () => void) {
  queueMicrotask(cb);
}

function SymbolSparkline({
  symbol,
  trendPositive,
  className = "",
  width = 56,
}: SymbolSparklineProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [closes, setCloses] = useState<number[] | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let cancelled = false;

    if (typeof IntersectionObserver !== "undefined") {
      const ob = new IntersectionObserver(
        ([e]) => {
          if (!e?.isIntersecting) return;
          ob.disconnect();
          scheduleIdle(() => {
            if (!cancelled) setVisible(true);
          });
        },
        { rootMargin: "120px 0px", threshold: 0 }
      );
      ob.observe(el);
      return () => {
        cancelled = true;
        ob.disconnect();
      };
    }

    scheduleIdle(() => {
      if (!cancelled) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void (async () => {
      const c = await fetch5dCloses(symbol);
      if (!alive) return;
      scheduleIdle(() => {
        if (!alive) return;
        setCloses(c.length >= 2 ? c : []);
      });
    })();
    return () => {
      alive = false;
    };
  }, [symbol, visible]);

  const pathD = useMemo(() => {
    if (!closes || closes.length < 2) return null;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const w = 56;
    const h = 28;
    const pad = 2;
    return closes
      .map((v, i) => {
        const x = pad + (i / (closes.length - 1)) * (w - pad * 2);
        const y = pad + (1 - (v - min) / span) * (h - pad * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [closes]);

  const up =
    closes != null &&
    closes.length >= 2 &&
    closes[closes.length - 1]! >= closes[0]!
      ? true
      : closes != null && closes.length >= 2
        ? false
        : trendPositive;

  return (
    <span ref={rootRef} className={`inline-flex shrink-0 ${className}`}>
      <svg
        width={width}
        height={28}
        viewBox="0 0 56 28"
        className={`shrink-0 ${up ? "text-green" : "text-red"}`}
        aria-hidden
      >
        {pathD ? (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <line
            x1="4"
            y1="14"
            x2="52"
            y2="14"
            className="text-muted opacity-35"
            stroke="currentColor"
            strokeWidth="1"
          />
        )}
      </svg>
    </span>
  );
}

export default memo(SymbolSparkline);

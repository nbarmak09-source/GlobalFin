"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { QuoteMap } from "@/app/api/quotes/route";

export type { QuoteMap, Quote } from "@/app/api/quotes/route";

interface Options {
  /** Polling interval in ms. Default: 20 000 (20 s) */
  interval?: number;
  /** Pause polling when the browser tab is hidden. Default: true */
  pauseWhenHidden?: boolean;
  /** Called whenever fresh data arrives */
  onUpdate?: (data: QuoteMap) => void;
}

interface State {
  data: QuoteMap;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Polls `/api/quotes?symbols=...` on a configurable interval.
 * Pauses when the tab is hidden and resumes on visibility.
 */
export function useLivePrices(
  symbols: string[],
  { interval = 20_000, pauseWhenHidden = true, onUpdate }: Options = {}
): State {
  const [state, setState] = useState<State>({
    data: {},
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const symbolsKey = symbols.join(",");

  const fetchPrices = useCallback(async () => {
    if (pauseWhenHidden && document.visibilityState === "hidden") return;
    if (symbols.length === 0) return;

    try {
      const res = await fetch(
        `/api/quotes?symbols=${encodeURIComponent(symbolsKey)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: QuoteMap = await res.json();
      setState((prev) => ({
        ...prev,
        data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      }));
      onUpdateRef.current?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [symbolsKey, pauseWhenHidden, symbols.length]);

  useEffect(() => {
    void fetchPrices();
    timerRef.current = setInterval(() => void fetchPrices(), interval);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchPrices();
    };

    if (pauseWhenHidden) {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchPrices, interval, pauseWhenHidden]);

  return state;
}

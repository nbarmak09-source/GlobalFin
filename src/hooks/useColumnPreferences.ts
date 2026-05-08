"use client";

import { useCallback, useState } from "react";
import {
  AVAILABLE_METRIC_KEY_SET,
  defaultPortfolioWatchlistVisibleKeys,
} from "@/lib/metrics";

const STORAGE_KEY = "gcm-column-prefs";

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return defaultPortfolioWatchlistVisibleKeys();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaultPortfolioWatchlistVisibleKeys();
    }

    if (!Array.isArray(parsed)) return defaultPortfolioWatchlistVisibleKeys();

    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "string") continue;
      if (!AVAILABLE_METRIC_KEY_SET.has(entry) || seen.has(entry)) continue;
      seen.add(entry);
      out.push(entry);
    }

    return out.length > 0 ? out : defaultPortfolioWatchlistVisibleKeys();
  } catch {
    return defaultPortfolioWatchlistVisibleKeys();
  }
}

function persist(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

export function useColumnPreferences(): readonly [
  string[],
  (key: string) => void,
  () => void,
] {
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    loadFromStorage()
  );

  const toggleKey = useCallback((key: string) => {
    if (!AVAILABLE_METRIC_KEY_SET.has(key)) return;
    setVisibleKeys((prev) => {
      const i = prev.indexOf(key);
      let next: string[];
      if (i >= 0) {
        next = prev.filter((k) => k !== key);
      } else {
        next = [...prev, key];
      }
      persist(next);
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    const next = defaultPortfolioWatchlistVisibleKeys();
    persist(next);
    setVisibleKeys(next);
  }, []);

  return [visibleKeys, toggleKey, resetToDefault] as const;
}

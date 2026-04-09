"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "gcm-organic-revenue-only";

interface OrganicRevenueContextValue {
  /** When true, charts should exclude inferred round-trip cloud/API revenue. */
  organicOnly: boolean;
  setOrganicOnly: (value: boolean) => void;
}

const OrganicRevenueContext = createContext<OrganicRevenueContextValue | null>(
  null
);

export function OrganicRevenueProvider({ children }: { children: ReactNode }) {
  const [organicOnly, setOrganicOnlyState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const setOrganicOnly = useCallback((value: boolean) => {
    setOrganicOnlyState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ organicOnly, setOrganicOnly }),
    [organicOnly, setOrganicOnly]
  );

  return (
    <OrganicRevenueContext.Provider value={value}>
      {children}
    </OrganicRevenueContext.Provider>
  );
}

export function useOrganicRevenueOnly(): OrganicRevenueContextValue {
  const ctx = useContext(OrganicRevenueContext);
  if (!ctx) {
    throw new Error(
      "useOrganicRevenueOnly must be used within OrganicRevenueProvider"
    );
  }
  return ctx;
}

/** Safe when provider is absent (no-op toggle). */
export function useOrganicRevenueOnlyOptional(): OrganicRevenueContextValue {
  return (
    useContext(OrganicRevenueContext) ?? {
      organicOnly: false,
      setOrganicOnly: () => {},
    }
  );
}

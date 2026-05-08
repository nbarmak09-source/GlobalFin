"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserPortfolio } from "@/lib/types";

const ACTIVE_PORTFOLIO_KEY = "active-portfolio-id";

const apiFetch = (input: string, init?: RequestInit) =>
  fetch(input, { ...init, credentials: "include" });

/** Portfolio picker state synced with the main holdings page (localStorage key). */
export function useActivePortfolio() {
  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);

  const fetchPortfolios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/portfolios");
      if (!res.ok) {
        setPortfolios([]);
        setActivePortfolioId(null);
        return;
      }
      const data: UserPortfolio[] = await res.json();
      setPortfolios(data);

      setActivePortfolioId((prev) => {
        if (typeof window === "undefined") return data[0]?.id ?? null;
        const saved = localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
        const match = saved ? data.find((p) => p.id === saved) : null;
        if (match) return match.id;
        if (prev && data.some((p) => p.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch {
      setPortfolios([]);
      setActivePortfolioId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  useEffect(() => {
    if (!activePortfolioId) return;
    localStorage.setItem(ACTIVE_PORTFOLIO_KEY, activePortfolioId);
  }, [activePortfolioId]);

  return {
    portfolios,
    activePortfolioId,
    setActivePortfolioId,
    loading,
    refetchPortfolios: fetchPortfolios,
  };
}

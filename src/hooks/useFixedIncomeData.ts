"use client";

import { useCallback, useEffect, useState } from "react";

export type SovereignRow = {
  country: string;
  symbol: string;
  level: number | null;
  changePercent: number | null;
};

export type SpreadRow = {
  name: string;
  symbol: string;
  level: number;
  spreadVs10Y: number;
};

export type MoneyRow = { name: string; value: number; unit: string };

export function useFixedIncomeData() {
  const [sovereign, setSovereign] = useState<SovereignRow[]>([]);
  const [spreads, setSpreads] = useState<SpreadRow[]>([]);
  const [money, setMoney] = useState<MoneyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        fetch("/api/fixed-income/sovereign"),
        fetch("/api/fixed-income/credit-spreads"),
        fetch("/api/fixed-income/money-markets"),
      ]);
      const sovereignJson = await a.json();
      const spreadsJson = await b.json();
      const moneyJson = await c.json();
      setSovereign(sovereignJson.rows ?? []);
      setSpreads(spreadsJson.spreads ?? []);
      setMoney(moneyJson.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { sovereign, spreads, money, loading, refetch };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { RevenueLoopEntry, RevenueLoopsFile } from "@/lib/revenueLoopTypes";

export interface UseRevenueLoopResult {
  isRoundTrip: boolean;
  /** Sum of equity invested toward this company / relationship (USD B). */
  capitalOut: number | null;
  /** Cloud/API spend delta over the following 12 months — Revenue In proxy (USD B). */
  revenueIn: number | null;
  /** Reported minus inferred round-trip recycling (USD B). */
  organicRevenue: number | null;
  /** Raw rows involving this company (investor or investee). */
  loops: RevenueLoopEntry[];
  loading: boolean;
  error: string | null;
}

function aggregateForInvestee(loops: RevenueLoopEntry[]): {
  capitalOut: number;
  revenueIn: number;
  organic: number;
} {
  const capitalOut = loops.reduce((s, l) => s + l.capitalOutAmountBn, 0);
  const revenueIn = loops.reduce((s, l) => s + l.cloudSpendDelta12mBn, 0);
  const organic = loops.reduce((s, l) => s + l.organicRevenueEstimateBn, 0);
  return { capitalOut, revenueIn, organic };
}

function aggregateForInvestor(loops: RevenueLoopEntry[]): {
  capitalOut: number;
  revenueIn: number;
  organic: number | null;
} {
  const capitalOut = loops.reduce((s, l) => s + l.capitalOutAmountBn, 0);
  const revenueIn = loops.reduce((s, l) => s + l.cloudSpendDelta12mBn, 0);
  const organicVals = loops.map((l) => l.investorSegmentOrganicBn);
  const organic =
    organicVals.length > 0
      ? organicVals.reduce((a, b) => a + b, 0) / organicVals.length
      : null;
  return { capitalOut, revenueIn, organic };
}

/**
 * Detects round-trip capital flows for a company node id (ecosystem `investorId` / `investeeId`).
 * Monetary values are USD billions; round to 1 decimal in UI via `fmtBn`.
 */
export function useRevenueLoop(companyId: string): UseRevenueLoopResult {
  const [file, setFile] = useState<RevenueLoopsFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/revenue-loops.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<RevenueLoopsFile>;
      })
      .then(setFile)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "load failed")
      );
  }, []);

  return useMemo(() => {
    if (error) {
      return {
        isRoundTrip: false,
        capitalOut: null,
        revenueIn: null,
        organicRevenue: null,
        loops: [],
        loading: false,
        error,
      };
    }
    if (!file) {
      return {
        isRoundTrip: false,
        capitalOut: null,
        revenueIn: null,
        organicRevenue: null,
        loops: [],
        loading: true,
        error: null,
      };
    }

    const loops = file.loops.filter(
      (l) =>
        l.roundTripDetected &&
        (l.investeeId === companyId || l.investorId === companyId)
    );

    if (loops.length === 0) {
      return {
        isRoundTrip: false,
        capitalOut: null,
        revenueIn: null,
        organicRevenue: null,
        loops: [],
        loading: false,
        error: null,
      };
    }

    const asInvestee = loops.filter((l) => l.investeeId === companyId);
    const asInvestor = loops.filter((l) => l.investorId === companyId);

    if (asInvestee.length > 0) {
      const { capitalOut, revenueIn, organic } = aggregateForInvestee(asInvestee);
      return {
        isRoundTrip: true,
        capitalOut,
        revenueIn,
        organicRevenue: organic,
        loops: asInvestee,
        loading: false,
        error: null,
      };
    }

    const { capitalOut, revenueIn, organic } = aggregateForInvestor(asInvestor);
    return {
      isRoundTrip: true,
      capitalOut,
      revenueIn,
      organicRevenue: organic,
      loops: asInvestor,
      loading: false,
      error: null,
    };
  }, [file, companyId, error]);
}

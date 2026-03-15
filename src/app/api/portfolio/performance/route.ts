import { NextRequest, NextResponse } from "next/server";
import { getPositions } from "@/lib/portfolio";
import { getHistoricalData } from "@/lib/yahoo";
import { getQuote } from "@/lib/yahoo";
import { auth } from "@/lib/auth";

const PERIODS = ["1D", "5D", "1M", "1Y", "5Y"] as const;

function toTimeMs(t: string | number): number {
  return typeof t === "number" ? t * 1000 : new Date(t).getTime();
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "1Y").toUpperCase();
    const validPeriod = PERIODS.includes(period as (typeof PERIODS)[number])
      ? period
      : "1Y";

    const positions = await getPositions(session.user.id);

    if (positions.length === 0) {
      return NextResponse.json([]);
    }

    const symbolHistories = await Promise.all(
      positions.map(async (pos) => {
        const data = await getHistoricalData(pos.symbol, validPeriod);
        return { symbol: pos.symbol, shares: pos.shares, purchaseDate: pos.purchaseDate, data };
      })
    );

    // Use positions that have data; fall back to current quote for symbols with no history
    const positionsWithData: { symbol: string; shares: number; purchaseDate?: string }[] = [];
    for (let i = 0; i < symbolHistories.length; i++) {
      const h = symbolHistories[i];
      const pos = positions[i];
      if (h.data.length > 0) {
        positionsWithData.push({
          symbol: h.symbol,
          shares: pos.shares,
          purchaseDate: pos.purchaseDate,
        });
      } else {
        const quote = await getQuote(h.symbol);
        const price = quote?.regularMarketPrice ?? pos.avgCost;
        if (price > 0) {
          positionsWithData.push({
            symbol: h.symbol,
            shares: pos.shares,
            purchaseDate: pos.purchaseDate,
          });
        }
      }
    }

    const timeToPrices = new Map<string | number, Map<string, number>>();

    for (const h of symbolHistories) {
      if (h.data.length === 0) continue;
      for (const point of h.data) {
        const t = point.time;
        if (!timeToPrices.has(t)) {
          timeToPrices.set(t, new Map());
        }
        timeToPrices.get(t)!.set(h.symbol, point.close);
      }
    }

    const allTimes = Array.from(timeToPrices.keys());
    const isIntraday = validPeriod === "1D" || validPeriod === "5D";
    let sortedTimes: (string | number)[];
    let tFirst: string | number;
    let tLast: string | number;

    if (allTimes.length > 0) {
      sortedTimes = [...allTimes].sort(
        (a, b) => toTimeMs(a) - toTimeMs(b)
      );
      tFirst = sortedTimes[0];
      tLast = sortedTimes[sortedTimes.length - 1];
    } else {
      const now = Date.now();
      const msPerPeriod: Record<string, number> = {
        "1D": 86400 * 1000,
        "5D": 5 * 86400 * 1000,
        "1M": 30 * 86400 * 1000,
        "1Y": 365 * 86400 * 1000,
        "5Y": 5 * 365 * 86400 * 1000,
      };
      const ms = msPerPeriod[validPeriod] ?? 365 * 86400 * 1000;
      tFirst = isIntraday ? Math.floor((now - ms) / 1000) : new Date(now - ms).toISOString().split("T")[0];
      tLast = isIntraday ? Math.floor(now / 1000) : new Date().toISOString().split("T")[0];
      sortedTimes = [tFirst, tLast];
    }

    for (const h of symbolHistories) {
      if (h.data.length > 0) continue;
      const quote = await getQuote(h.symbol);
      const price = quote?.regularMarketPrice ?? positions.find((p) => p.symbol === h.symbol)?.avgCost ?? 0;
      if (price > 0) {
        if (!timeToPrices.has(tFirst)) timeToPrices.set(tFirst, new Map());
        timeToPrices.get(tFirst)!.set(h.symbol, price);
        if (tFirst !== tLast && !timeToPrices.has(tLast)) timeToPrices.set(tLast, new Map());
        if (tFirst !== tLast) timeToPrices.get(tLast)!.set(h.symbol, price);
      }
    }

    const symbolToLastPrice = new Map<string, number>();
    const series: { time: string | number; value: number }[] = [];

    for (const t of sortedTimes) {
      const prices = timeToPrices.get(t);
      if (prices) {
        for (const [sym, close] of prices) {
          symbolToLastPrice.set(sym, close);
        }
      }

      const usedPositions = positionsWithData.filter((pos) => {
        if (!symbolToLastPrice.has(pos.symbol)) return false;
        if (pos.purchaseDate) {
          const tMs = toTimeMs(t);
          const purchaseMs = new Date(pos.purchaseDate).getTime();
          if (tMs < purchaseMs) return false;
        }
        return true;
      });

      if (usedPositions.length === 0) continue;

      let portfolioValue = 0;
      for (const pos of usedPositions) {
        const price = symbolToLastPrice.get(pos.symbol)!;
        portfolioValue += pos.shares * price;
      }

      if (portfolioValue > 0) {
        series.push({ time: t, value: Math.round(portfolioValue * 100) / 100 });
      }
    }

    return NextResponse.json(series);
  } catch (error) {
    console.error("Portfolio performance error:", error);
    return NextResponse.json(
      { error: "Failed to compute portfolio performance" },
      { status: 500 }
    );
  }
}

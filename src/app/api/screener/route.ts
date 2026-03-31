import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuoteSummary } from "@/lib/yahoo";
import type { QuoteSummaryData } from "@/lib/types";

const SP500_SAMPLE = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
  "JPM", "V", "UNH", "XOM", "JNJ", "WMT", "PG", "MA", "HD", "CVX",
  "MRK", "KO", "ABBV", "PEP", "AVGO", "COST", "LLY", "TMO", "MCD",
  "CSCO", "ACN", "ABT", "CRM", "DHR", "NKE", "TXN", "NEE", "UPS",
  "LIN", "PM", "RTX", "ORCL", "HON", "LOW", "AMGN", "UNP", "BA",
  "INTC", "IBM", "GS", "CAT", "AMD",
];

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  dayChangePct: number;
  pe: number;
  forwardPE: number;
  dividendYield: number;
  beta: number;
  revenueGrowth: number;
  profitMargins: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  recommendationMean: number;
  recommendationKey: string;
  debtToEquity: number;
  currentRatio: number;
  priceToBook: number;
}

function passesFilters(
  d: QuoteSummaryData,
  filters: Record<string, string>
): boolean {
  if (filters.sector && d.sector !== filters.sector) return false;

  if (filters.minMarketCap) {
    const v = parseFloat(filters.minMarketCap);
    if (!isNaN(v) && d.marketCap < v) return false;
  }
  if (filters.maxMarketCap) {
    const v = parseFloat(filters.maxMarketCap);
    if (!isNaN(v) && d.marketCap > v) return false;
  }

  if (filters.minPE) {
    const v = parseFloat(filters.minPE);
    if (!isNaN(v) && (d.trailingPE <= 0 || d.trailingPE < v)) return false;
  }
  if (filters.maxPE) {
    const v = parseFloat(filters.maxPE);
    if (!isNaN(v) && (d.trailingPE <= 0 || d.trailingPE > v)) return false;
  }

  if (filters.minDividendYield) {
    const v = parseFloat(filters.minDividendYield);
    if (!isNaN(v) && d.dividendYield * 100 < v) return false;
  }
  if (filters.maxDividendYield) {
    const v = parseFloat(filters.maxDividendYield);
    if (!isNaN(v) && d.dividendYield * 100 > v) return false;
  }

  if (filters.minBeta) {
    const v = parseFloat(filters.minBeta);
    if (!isNaN(v) && d.beta < v) return false;
  }
  if (filters.maxBeta) {
    const v = parseFloat(filters.maxBeta);
    if (!isNaN(v) && d.beta > v) return false;
  }

  if (filters.minRevenueGrowth) {
    const v = parseFloat(filters.minRevenueGrowth);
    if (!isNaN(v) && d.revenueGrowth * 100 < v) return false;
  }
  if (filters.maxRevenueGrowth) {
    const v = parseFloat(filters.maxRevenueGrowth);
    if (!isNaN(v) && d.revenueGrowth * 100 > v) return false;
  }

  if (filters.maxDebtToEquity) {
    const v = parseFloat(filters.maxDebtToEquity);
    if (!isNaN(v) && (d.debtToEquity <= 0 || d.debtToEquity > v)) return false;
  }
  if (filters.minCurrentRatio) {
    const v = parseFloat(filters.minCurrentRatio);
    if (!isNaN(v) && (d.currentRatio <= 0 || d.currentRatio < v)) return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: Record<string, string> = {};
    for (const [key, val] of searchParams.entries()) {
      if (val) filters[key] = val;
    }

    const batchSize = 10;
    const results: ScreenerResult[] = [];

    for (let i = 0; i < SP500_SAMPLE.length; i += batchSize) {
      const batch = SP500_SAMPLE.slice(i, i + batchSize);
      const summaries = await Promise.allSettled(
        batch.map((sym) => getQuoteSummary(sym))
      );

      summaries.forEach((result) => {
        if (result.status !== "fulfilled" || !result.value) return;
        const d = result.value;

        if (!passesFilters(d, filters)) return;

        results.push({
          symbol: d.symbol,
          name: d.shortName || d.longName || d.symbol,
          sector: d.sector || "Other",
          industry: d.industry || "",
          marketCap: d.marketCap,
          price: d.regularMarketPrice,
          dayChangePct: d.regularMarketChangePercent,
          pe: d.trailingPE,
          forwardPE: d.forwardPE,
          dividendYield: d.dividendYield * 100,
          beta: d.beta,
          revenueGrowth: d.revenueGrowth * 100,
          profitMargins: d.profitMargins * 100,
          fiftyTwoWeekHigh: d.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: d.fiftyTwoWeekLow,
          recommendationMean: d.recommendationMean ?? 0,
          recommendationKey: d.recommendationKey ?? "",
          debtToEquity: d.debtToEquity ?? 0,
          currentRatio: d.currentRatio ?? 0,
          priceToBook: d.priceToBook ?? 0,
        });
      });
    }

    results.sort((a, b) => b.marketCap - a.marketCap);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Screener GET error:", error);
    return NextResponse.json(
      { error: "Failed to run screener" },
      { status: 500 }
    );
  }
}

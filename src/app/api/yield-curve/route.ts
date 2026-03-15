import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

const US_TREASURY_TICKERS = [
  { symbol: "^IRX", label: "3M", years: 0.25 },
  { symbol: "TMUBMUSD02Y", label: "2Y", years: 2 },
  { symbol: "^FVX", label: "5Y", years: 5 },
  { symbol: "^TNX", label: "10Y", years: 10 },
  { symbol: "^TYX", label: "30Y", years: 30 },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || "US";
  if (country !== "US") {
    return NextResponse.json(
      { error: "Only US yield curve is supported" },
      { status: 400 }
    );
  }

  const tenors: Array<{
    label: string;
    years: number;
    yield: number;
    change?: number;
    changePercent?: number;
  }> = [];

  for (const { symbol, label, years } of US_TREASURY_TICKERS) {
    const q = await getQuote(symbol);
    if (!q) continue;
    tenors.push({
      label,
      years,
      yield: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? undefined,
      changePercent: q.regularMarketChangePercent ?? undefined,
    });
  }

  return NextResponse.json({ tenors, asOf: new Date().toISOString() });
}


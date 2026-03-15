import { NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

export async function GET() {
  const [ig, hy, ust10] = await Promise.all([
    getQuote("LQD"),
    getQuote("HYG"),
    getQuote("^TNX"),
  ]);

  const riskFree = ust10?.regularMarketPrice ?? 0;
  const igLevel = ig?.regularMarketPrice ?? 0;
  const hyLevel = hy?.regularMarketPrice ?? 0;

  return NextResponse.json({
    asOf: new Date().toISOString(),
    riskFree10Y: riskFree,
    spreads: [
      {
        name: "Investment Grade (LQD proxy)",
        symbol: "LQD",
        level: igLevel,
        spreadVs10Y: igLevel - riskFree,
      },
      {
        name: "High Yield (HYG proxy)",
        symbol: "HYG",
        level: hyLevel,
        spreadVs10Y: hyLevel - riskFree,
      },
    ],
  });
}


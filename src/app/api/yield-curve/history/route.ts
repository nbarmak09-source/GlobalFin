import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET() {
  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  try {
    const result = await yf.chart("^TNX", {
      period1: twoYearsAgo.toISOString().split("T")[0],
      period2: now.toISOString().split("T")[0],
      interval: "1wk",
    });

    const points = (result.quotes || [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        close: q.close!,
      }));

    return NextResponse.json({ symbol: "^TNX", name: "US 10Y Treasury Yield", points });
  } catch (err) {
    console.error("yield-curve/history error:", err);
    return NextResponse.json({ symbol: "^TNX", name: "US 10Y Treasury Yield", points: [] });
  }
}

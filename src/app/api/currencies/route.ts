import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

const DEFAULT_PAIRS = [
  { ticker: "EURUSD=X", pair: "EUR / USD" },
  { ticker: "JPY=X", pair: "USD / JPY" },
  { ticker: "GBPUSD=X", pair: "GBP / USD" },
  { ticker: "CAD=X", pair: "USD / CAD" },
  { ticker: "AUDUSD=X", pair: "AUD / USD" },
  { ticker: "CHF=X", pair: "USD / CHF" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pairsParam = searchParams.get("pairs");
  const pairs = pairsParam
    ? pairsParam.split(",").map((p) => {
        const [base, quote] = p
          .trim()
          .split("/")
          .map((s) => s.trim().toUpperCase());
        const ticker =
          quote === "USD"
            ? `${base}=X`
            : base === "USD"
            ? `${quote}=X`
            : `${base}${quote}=X`;
        return { ticker, pair: `${base} / ${quote}` };
      })
    : DEFAULT_PAIRS;

  const out: Array<{
    pair: string;
    price: number;
    change: number;
    changePercent: number;
    timestamp: string;
  }> = [];

  for (const { ticker, pair } of pairs) {
    const q = await getQuote(ticker);
    if (!q) continue;
    out.push({
      pair,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(out);
}


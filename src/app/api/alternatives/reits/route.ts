import { NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

const REITS = ["VNQ", "SCHH", "IYR", "O", "SPG"];

export async function GET() {
  const rows = [];
  for (const symbol of REITS) {
    const q = await getQuote(symbol);
    if (!q) continue;
    rows.push({
      symbol,
      name: q.shortName || symbol,
      price: q.regularMarketPrice ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
    });
  }
  return NextResponse.json({ asOf: new Date().toISOString(), rows });
}


import { NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

const G7_PROXY_BONDS = [
  { country: "United States", symbol: "^TNX" },
  { country: "Canada", symbol: "^GSPTSE" },
  { country: "Germany", symbol: "BND" },
  { country: "United Kingdom", symbol: "IGLT.L" },
  { country: "France", symbol: "OAT.PA" },
  { country: "Italy", symbol: "BTP.MI" },
  { country: "Japan", symbol: "EWJ" },
];

export async function GET() {
  const rows: Array<{
    country: string;
    symbol: string;
    level: number;
    changePercent: number;
  }> = [];

  for (const item of G7_PROXY_BONDS) {
    const q = await getQuote(item.symbol);
    if (!q) continue;
    rows.push({
      country: item.country,
      symbol: item.symbol,
      level: q.regularMarketPrice ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
    });
  }

  return NextResponse.json({ asOf: new Date().toISOString(), rows });
}


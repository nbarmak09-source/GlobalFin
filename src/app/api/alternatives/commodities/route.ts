import { NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

const COMMODITIES = [
  { symbol: "GC=F", label: "Gold" },
  { symbol: "SI=F", label: "Silver" },
  { symbol: "HG=F", label: "Copper" },
  { symbol: "PA=F", label: "Palladium" },
  { symbol: "CL=F", label: "WTI Crude" },
  { symbol: "NG=F", label: "Natural Gas" },
  { symbol: "ZC=F", label: "Corn" },
  { symbol: "LIT", label: "Lithium (LIT ETF)" },
];

export async function GET() {
  const rows = [];
  for (const item of COMMODITIES) {
    const q = await getQuote(item.symbol);
    if (!q) continue;
    rows.push({
      symbol: item.symbol,
      name: item.label,
      price: q.regularMarketPrice ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
    });
  }
  return NextResponse.json({ asOf: new Date().toISOString(), rows });
}


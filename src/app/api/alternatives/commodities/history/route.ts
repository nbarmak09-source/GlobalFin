import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/yahoo";

const COMMODITIES = [
  { symbol: "GC=F", label: "Gold" },
  { symbol: "SI=F", label: "Silver" },
  { symbol: "CL=F", label: "WTI Crude" },
  { symbol: "NG=F", label: "Natural Gas" },
  { symbol: "ZC=F", label: "Corn" },
  { symbol: "LIT", label: "Lithium (LIT ETF)" },
];

const VALID_PERIODS = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const period = searchParams.get("period") || "1M";

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const commodity = COMMODITIES.find((c) => c.symbol === symbol);
  if (!commodity) {
    return NextResponse.json({ error: "Invalid commodity symbol" }, { status: 400 });
  }

  const points = await getHistoricalData(commodity.symbol, period);

  return NextResponse.json({
    symbol: commodity.symbol,
    name: commodity.label,
    period,
    points: points.map((p) => ({
      time: p.time,
      close: p.close,
    })),
  });
}

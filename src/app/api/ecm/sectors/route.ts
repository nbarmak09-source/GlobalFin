import { NextResponse } from "next/server";
import { getQuote, getHistoricalData } from "@/lib/yahoo";

type SectorRow = {
  symbol: string;
  name: string;
  color: string;
  price: number;
  dayChange: number;
  dayChangePct: number;
  ytdChangePct: number | null;
  marketCap: number;
};

const SECTOR_ETFS: { symbol: string; name: string; color: string }[] = [
  { symbol: "XLK", name: "Technology", color: "#3b82f6" },
  { symbol: "XLF", name: "Financials", color: "#f59e0b" },
  { symbol: "XLE", name: "Energy", color: "#ef4444" },
  { symbol: "XLV", name: "Health Care", color: "#10b981" },
  { symbol: "XLY", name: "Consumer Disc.", color: "#a855f7" },
  { symbol: "XLP", name: "Consumer Staples", color: "#ec4899" },
  { symbol: "XLI", name: "Industrials", color: "#f97316" },
  { symbol: "XLB", name: "Materials", color: "#eab308" },
  { symbol: "XLRE", name: "Real Estate", color: "#84cc16" },
  { symbol: "XLU", name: "Utilities", color: "#14b8a6" },
  { symbol: "XLC", name: "Comm. Services", color: "#06b6d4" },
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SECTOR_ETFS.map(async (sector) => {
        const quote = await getQuote(sector.symbol);
        if (!quote) return null;

        const ytdData = await getHistoricalData(sector.symbol, "YTD");
        const ytdStart = ytdData.length > 0 ? ytdData[0].close : null;
        const ytdChangePct =
          ytdStart && ytdStart > 0
            ? ((quote.regularMarketPrice - ytdStart) / ytdStart) * 100
            : null;

        return {
          symbol: sector.symbol,
          name: sector.name,
          color: sector.color,
          price: quote.regularMarketPrice,
          dayChange: quote.regularMarketChange,
          dayChangePct: quote.regularMarketChangePercent,
          ytdChangePct,
          marketCap: quote.marketCap,
        };
      })
    );

    const sectors = results
      .filter(
        (r): r is PromiseFulfilledResult<SectorRow> =>
          r.status === "fulfilled" && r.value !== null
      )
      .map((r) => r.value);

    return NextResponse.json(sectors);
  } catch (error) {
    console.error("Sectors API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sector data" },
      { status: 500 }
    );
  }
}

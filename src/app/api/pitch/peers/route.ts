import { NextRequest, NextResponse } from "next/server";
import { getQuoteSummary } from "@/lib/yahoo";

// Sector-based peer lists for quick fallback
const SECTOR_PEERS: Record<string, string[]> = {
  Technology: ["AAPL", "MSFT", "GOOGL", "META", "AMZN", "NVDA", "TSLA", "AVGO", "ORCL", "CRM"],
  "Financial Services": ["JPM", "BAC", "WFC", "GS", "MS", "C", "USB", "PNC", "AXP", "BLK"],
  Healthcare: ["JNJ", "UNH", "PFE", "ABT", "MRK", "TMO", "DHR", "MDT", "AMGN", "GILD"],
  "Consumer Cyclical": ["AMZN", "TSLA", "HD", "MCD", "NKE", "SBUX", "TJX", "LOW", "BKNG", "MAR"],
  "Consumer Defensive": ["WMT", "PG", "KO", "PEP", "COST", "MDLZ", "CL", "GIS", "KHC", "SYY"],
  Energy: ["XOM", "CVX", "COP", "SLB", "EOG", "PXD", "PSX", "VLO", "MPC", "OXY"],
  Industrials: ["CAT", "HON", "GE", "UPS", "BA", "RTX", "LMT", "DE", "MMM", "ITW"],
  "Basic Materials": ["LIN", "APD", "ECL", "DD", "NEM", "FCX", "NUE", "VMC", "MLM", "ALB"],
  "Real Estate": ["PLD", "AMT", "EQIX", "CCI", "PSA", "O", "AVB", "EQR", "DLR", "WELL"],
  Utilities: ["NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "XEL", "WEC", "ES"],
  "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "CMCSA", "T", "VZ", "CHTR", "TMUS", "SNAP"],
};

export interface PeerData {
  symbol: string;
  name: string;
  price: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  evToEbitda: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  returnOnEquity: number | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const sector = searchParams.get("sector") ?? "";
  const peersParam = searchParams.get("peers"); // comma-separated custom peers

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  // Determine peer list: custom > sector-based, always exclude the subject company
  let peerSymbols: string[];
  if (peersParam) {
    peerSymbols = peersParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s && s !== symbol)
      .slice(0, 6);
  } else {
    const sectorPeers = SECTOR_PEERS[sector] ?? SECTOR_PEERS["Technology"];
    peerSymbols = sectorPeers.filter((s) => s !== symbol).slice(0, 5);
  }

  // Fetch all in parallel
  const allSymbols = [symbol, ...peerSymbols];
  const results = await Promise.allSettled(allSymbols.map((s) => getQuoteSummary(s)));

  const peers: PeerData[] = results
    .map((result, i) => {
      const sym = allSymbols[i];
      if (result.status === "rejected" || !result.value) {
        return { symbol: sym, name: sym, price: null, marketCap: null, trailingPE: null, forwardPE: null, priceToBook: null, evToEbitda: null, revenueGrowth: null, grossMargins: null, operatingMargins: null, returnOnEquity: null } as PeerData;
      }
      const d = result.value;
      return {
        symbol: sym,
        name: d.shortName ?? d.longName ?? sym,
        price: d.regularMarketPrice ?? null,
        marketCap: d.marketCap ?? null,
        trailingPE: d.trailingPE ?? null,
        forwardPE: d.forwardPE ?? null,
        priceToBook: d.priceToBook ?? null,
        evToEbitda: d.enterpriseToEbitda ?? null,
        revenueGrowth: d.revenueGrowth ?? null,
        grossMargins: d.grossMargins ?? null,
        operatingMargins: d.operatingMargins ?? null,
        returnOnEquity: d.returnOnEquity ?? null,
      } as PeerData;
    });

  return NextResponse.json({ subject: symbol, peers });
}

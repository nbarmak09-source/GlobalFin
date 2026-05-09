import { NextRequest, NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/yahoo";

const FMP_STABLE = "https://financialmodelingprep.com/stable";

function getApiKey(): string | null {
  const k = process.env.FMP_API_KEY?.trim();
  return k || null;
}

interface FmpEarningsRow {
  symbol: string;
  date: string;
  epsActual: number | null;
  epsEstimated: number | null;
  revenueActual: number | null;
  revenueEstimated: number | null;
  time?: string;
  fiscalDateEnding?: string;
}

export interface EarningsEvent {
  symbol: string;
  companyName: string;
  date: string;
  time: "bmo" | "amc" | null;
  fiscalDateEnding: string;
  revenue: number | null;
  revenueEstimated: number | null;
  revenueVsEstimate: number | null;
  eps: number | null;
  epsEstimated: number | null;
  epsVsEstimate: number | null;
  marketCap: number | null;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function pctVsEstimate(actual: number | null, estimate: number | null): number | null {
  if (actual == null || estimate == null || estimate === 0) return null;
  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

function parseFmpTime(raw: string): "bmo" | "amc" | null {
  if (raw === "bmo") return "bmo";
  if (raw === "amc") return "amc";
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to params required" }, { status: 400 });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "FMP_API_KEY not configured" }, { status: 503 });
  }

  const url = `${FMP_STABLE}/earnings-calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${encodeURIComponent(apiKey)}`;

  let rawRows: FmpEarningsRow[] = [];
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: `FMP returned ${res.status}` }, { status: 502 });
    }
    const json: unknown = await res.json();
    if (!Array.isArray(json)) {
      return NextResponse.json([], { status: 200 });
    }
    rawRows = json as FmpEarningsRow[];
  } catch (e) {
    console.error("[/api/fmp/earnings-calendar] FMP fetch failed:", e);
    return NextResponse.json({ error: "Failed to fetch earnings calendar" }, { status: 502 });
  }

  const symbols = [...new Set(rawRows.map((r) => r.symbol).filter(Boolean))];

  // Enrich with Yahoo quotes for companyName and marketCap
  const yahooMap = new Map<string, { shortName: string; marketCap: number | null }>();
  try {
    const quotes = await getMultipleQuotes(symbols);
    for (const q of quotes) {
      yahooMap.set(q.symbol.toUpperCase(), {
        shortName: q.shortName || q.symbol,
        marketCap: q.marketCap > 0 ? q.marketCap : null,
      });
    }
  } catch {
    // Yahoo failed — fall back to symbol as name, null as marketCap
  }

  const events: EarningsEvent[] = rawRows.map((row) => {
    const sym = row.symbol.toUpperCase();
    const yahoo = yahooMap.get(sym);
    const rev = toNum(row.revenueActual);
    const revEst = toNum(row.revenueEstimated);
    const eps = toNum(row.epsActual);
    const epsEst = toNum(row.epsEstimated);
    return {
      symbol: sym,
      companyName: yahoo?.shortName ?? sym,
      date: row.date,
      time: parseFmpTime(row.time ?? ""),
      fiscalDateEnding: row.fiscalDateEnding ?? "",
      revenue: rev,
      revenueEstimated: revEst,
      revenueVsEstimate: pctVsEstimate(rev, revEst),
      eps,
      epsEstimated: epsEst,
      epsVsEstimate: pctVsEstimate(eps, epsEst),
      marketCap: yahoo?.marketCap ?? null,
    };
  });

  // Sort by marketCap descending, nulls last; return top 100
  events.sort((a, b) => {
    if (a.marketCap === null && b.marketCap === null) return 0;
    if (a.marketCap === null) return 1;
    if (b.marketCap === null) return -1;
    return b.marketCap - a.marketCap;
  });

  return NextResponse.json(events.slice(0, 100));
}

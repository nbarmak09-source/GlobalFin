import { NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/yahoo";
import type { StockQuote } from "@/lib/types";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

/** 10Y government benchmark yields: Yahoo Finance treasury-benchmark symbols, FRED fallback (percent). */
const G7_YIELDS: {
  country: string;
  yahooSymbol: string;
  /** Long-term 10Y-ish series; used when Yahoo is missing or not trusted for this row */
  fredSeriesId?: string;
}[] = [
  { country: "United States", yahooSymbol: "^TNX", fredSeriesId: "DGS10" },
  { country: "Canada", yahooSymbol: "^TMBMKCA-10Y", fredSeriesId: "IRLTLT01CAM156N" },
  { country: "Germany", yahooSymbol: "^TMBMKDE-10Y", fredSeriesId: "IRLTLT01DEM156N" },
  { country: "United Kingdom", yahooSymbol: "^TMBMKGB-10Y", fredSeriesId: "IRLTLT01GBM156N" },
  { country: "France", yahooSymbol: "^TMBMKFR-10Y", fredSeriesId: "IRLTLT01FRM156N" },
  { country: "Italy", yahooSymbol: "^TMBMKIT-10Y", fredSeriesId: "IRLTLT01ITM156N" },
  { country: "Japan", yahooSymbol: "^TMBMKJP-10Y", fredSeriesId: "IRLTLT01JPM156N" },
];

/** Symbols whose Yahoo `regularMarketPrice` is the yield in % (not an ETF/index price). */
function isTreasuryBenchmarkYieldSymbol(symbol: string): boolean {
  const s = symbol.trim().toUpperCase();
  if (s === "^TNX") return true;
  return /^\^TMBMK[A-Z]{2}-10Y$/.test(s);
}

/** Reject obvious non-yields (equity indices, DXY-style quotes, stale zeros). */
function isPlausibleGovBondYieldPercent(p: number): boolean {
  if (!Number.isFinite(p)) return false;
  return p > -0.25 && p <= 45;
}

function findQuote(quotes: StockQuote[], symbol: string): StockQuote | undefined {
  const u = symbol.trim().toUpperCase();
  return quotes.find(
    (q) =>
      q.symbol.toUpperCase() === u ||
      q.symbol.toUpperCase() === u.replace(/^\^/, "") ||
      `^${q.symbol}`.toUpperCase() === u
  );
}

async function fetchFredLatestYield(
  seriesId: string,
  apiKey: string
): Promise<{ level: number; changePercent: number } | null> {
  const url = `${FRED_BASE}?series_id=${encodeURIComponent(
    seriesId
  )}&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=desc&limit=6`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    observations?: { value: string }[];
  };
  const obs = (data.observations || []).filter((o) => o.value !== ".");
  if (obs.length < 1) return null;
  const latest = parseFloat(obs[0]!.value);
  if (!Number.isFinite(latest) || !isPlausibleGovBondYieldPercent(latest)) return null;
  let changePercent = 0;
  if (obs.length >= 2) {
    const prev = parseFloat(obs[1]!.value);
    if (Number.isFinite(prev) && prev !== 0) {
      changePercent = ((latest - prev) / prev) * 100;
    }
  }
  return { level: latest, changePercent };
}

export async function GET() {
  const fredKey = process.env.FRED_API_KEY?.trim();
  const symbols = G7_YIELDS.map((r) => r.yahooSymbol);
  const quotes = await getMultipleQuotes(symbols);

  type Row = {
    country: string;
    symbol: string;
    level: number | null;
    changePercent: number | null;
    fredSeriesId?: string;
  };

  const rows: Row[] = G7_YIELDS.map((def) => {
    const q = findQuote(quotes, def.yahooSymbol);
    let level: number | null = null;
    let changePercent: number | null = null;

    const price = q?.regularMarketPrice;
    if (
      q &&
      isTreasuryBenchmarkYieldSymbol(def.yahooSymbol) &&
      isPlausibleGovBondYieldPercent(price ?? NaN)
    ) {
      level = price!;
      changePercent =
        typeof q.regularMarketChangePercent === "number" &&
        Number.isFinite(q.regularMarketChangePercent)
          ? q.regularMarketChangePercent
          : 0;
    }

    return {
      country: def.country,
      symbol: def.yahooSymbol,
      level,
      changePercent,
      fredSeriesId: def.fredSeriesId,
    };
  });

  await Promise.all(
    rows.map(async (row, i) => {
      if (row.level != null || !row.fredSeriesId || !fredKey) return;
      const f = await fetchFredLatestYield(row.fredSeriesId, fredKey);
      if (f) {
        rows[i] = {
          ...row,
          level: f.level,
          changePercent: f.changePercent,
          symbol: `FRED:${row.fredSeriesId}`,
        };
      }
    })
  );

  return NextResponse.json({
    asOf: new Date().toISOString(),
    rows: rows.map(({ country, symbol, level, changePercent }) => ({
      country,
      symbol,
      level,
      changePercent,
    })),
  });
}

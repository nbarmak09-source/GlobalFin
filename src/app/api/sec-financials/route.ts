import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const COMPANY_FACTS_BASE = "https://data.sec.gov/api/xbrl/companyfacts";
const CACHE_PATH = path.join(process.cwd(), "sec-financials-cache.json");

interface CachedSECEntry {
  symbol: string;
  cik: string;
  annualData: {
    fiscalYear: string;
    revenue: number | null;
    capex: number | null;
    depreciation: number | null;
    currentAssets: number | null;
    currentLiabilities: number | null;
    workingCapital: number | null;
    operatingCashflow: number | null;
  }[];
}

interface SECCacheFile {
  fetchedDate: string;
  entries: CachedSECEntry[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCache(): SECCacheFile | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")) as SECCacheFile;
    if (data.fetchedDate === todayStr()) return data;
    return null;
  } catch {
    return null;
  }
}

function saveCache(cache: SECCacheFile): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Capital-Markets-Dashboard/1.0 (contact: example@example.com)",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`SEC API error ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

async function getCIKForSymbol(symbol: string): Promise<string | null> {
  type TickerEntry = { cik_str: number; ticker: string };

  const tickers = await fetchJSON<Record<string, TickerEntry>>(TICKERS_URL);
  const upper = symbol.toUpperCase();

  const match =
    Object.values(tickers).find(
      (entry) => entry.ticker.toUpperCase() === upper
    ) || null;

  if (!match) return null;

  return match.cik_str.toString().padStart(10, "0");
}

type CompanyFacts = {
  facts?: {
    [taxonomy: string]: {
      [concept: string]: {
        units?: {
          [unit: string]: {
            start?: string;
            end?: string;
            val?: number;
            form?: string;
          }[];
        };
      };
    };
  };
};

function extractAnnualSeries(
  facts: CompanyFacts,
  concept: string
): { fiscalYear: string; value: number }[] {
  const container = facts.facts?.["us-gaap"]?.[concept];
  if (!container?.units) return [];

  const allPoints: { end: string; value: number; form?: string }[] = [];

  for (const unit of Object.values(container.units)) {
    for (const point of unit) {
      if (!point.end || typeof point.val !== "number") continue;
      allPoints.push({ end: point.end, value: point.val, form: point.form });
    }
  }

  const latestPerYear = new Map<string, { end: string; value: number }>();

  for (const p of allPoints) {
    const year = new Date(p.end).getUTCFullYear().toString();
    const existing = latestPerYear.get(year);
    if (!existing || new Date(p.end) > new Date(existing.end)) {
      latestPerYear.set(year, { end: p.end, value: p.value });
    }
  }

  return Array.from(latestPerYear.entries())
    .map(([fiscalYear, { value }]) => ({ fiscalYear, value }))
    .sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const upperSymbol = symbol.toUpperCase();

    let cache = readCache();
    let cachedEntry: CachedSECEntry | undefined;

    if (cache) {
      cachedEntry = cache.entries.find(
        (e) => e.symbol.toUpperCase() === upperSymbol
      );
      if (cachedEntry) {
        return NextResponse.json(cachedEntry);
      }
    }

    const cik = await getCIKForSymbol(upperSymbol);
    if (!cik) {
      return NextResponse.json(
        { error: "CIK not found for symbol" },
        { status: 404 }
      );
    }

    const factsUrl = `${COMPANY_FACTS_BASE}/CIK${cik}.json`;
    const facts = await fetchJSON<CompanyFacts>(factsUrl);

    const revenues =
      extractAnnualSeries(facts, "Revenues") ||
      extractAnnualSeries(facts, "RevenueFromContractWithCustomerExcludingAssessedTax");
    const capex = extractAnnualSeries(
      facts,
      "PaymentsToAcquirePropertyPlantAndEquipment"
    );
    const depreciation =
      extractAnnualSeries(facts, "DepreciationDepletionAndAmortization") ||
      extractAnnualSeries(facts, "DepreciationAndAmortization");
    const assetsCurrent = extractAnnualSeries(facts, "AssetsCurrent");
    const liabilitiesCurrent = extractAnnualSeries(
      facts,
      "LiabilitiesCurrent"
    );
    const operatingCf = extractAnnualSeries(
      facts,
      "NetCashProvidedByUsedInOperatingActivities"
    );

    const years = new Set<string>();
    [revenues, capex, depreciation, assetsCurrent, liabilitiesCurrent, operatingCf].forEach(
      (series) => series.forEach((p) => years.add(p.fiscalYear))
    );

    const annualData = Array.from(years)
      .sort((a, b) => Number(b) - Number(a))
      .slice(0, 5)
      .map((year) => {
        const rev = revenues.find((p) => p.fiscalYear === year)?.value ?? null;
        const cx = capex.find((p) => p.fiscalYear === year)?.value ?? null;
        const dep =
          depreciation.find((p) => p.fiscalYear === year)?.value ?? null;
        const ca =
          assetsCurrent.find((p) => p.fiscalYear === year)?.value ?? null;
        const cl =
          liabilitiesCurrent.find((p) => p.fiscalYear === year)?.value ?? null;
        const ocf =
          operatingCf.find((p) => p.fiscalYear === year)?.value ?? null;

        const workingCapital =
          ca != null && cl != null ? ca - cl : null;

        return {
          fiscalYear: year,
          revenue: rev,
          capex: cx,
          depreciation: dep,
          currentAssets: ca,
          currentLiabilities: cl,
          workingCapital,
          operatingCashflow: ocf,
        };
      });

    const result: CachedSECEntry = {
      symbol: upperSymbol,
      cik,
      annualData,
    };

    if (!cache) {
      cache = { fetchedDate: todayStr(), entries: [result] };
    } else {
      cache.entries.push(result);
    }
    saveCache(cache);

    return NextResponse.json(result);
  } catch (error) {
    console.error("SEC financials API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SEC financials" },
      { status: 500 }
    );
  }
}


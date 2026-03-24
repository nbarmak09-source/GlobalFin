import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { SECAnnualFinancialRow, SECFinancials } from "@/lib/types";
import { getAnnualFinancialsFromYahoo } from "@/lib/yahooAnnualFundamentals";

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const COMPANY_FACTS_BASE = "https://data.sec.gov/api/xbrl/companyfacts";
const CACHE_PATH = path.join(process.cwd(), "sec-financials-cache.json");

/** SEC requires a descriptive User-Agent with contact info. */
function secUserAgent(): string {
  const fromEnv = process.env.SEC_USER_AGENT?.trim();
  if (fromEnv) return fromEnv;
  return "GlobalCapitalMarkets/1.0 (https://github.com/nbarmak09-source/Global-Capital-Markets; support@example.com)";
}

interface CachedSECEntry extends SECFinancials {}

interface SECCacheFile {
  fetchedDate: string;
  entries: CachedSECEntry[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function readFullCache(): SECCacheFile | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    return JSON.parse(
      fs.readFileSync(CACHE_PATH, "utf-8"),
    ) as SECCacheFile;
  } catch {
    return null;
  }
}

function hasUsableAnnualRows(data: SECAnnualFinancialRow[] | undefined) {
  if (!data?.length) return false;
  return data.some((r) => r.revenue != null && r.revenue > 0);
}

function getCachedEntry(
  symbol: string,
  maxAgeDays = 7,
): CachedSECEntry | null {
  const cache = readFullCache();
  if (!cache?.entries?.length) return null;
  const hit = cache.entries.find(
    (e) => e.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!hit || !hasUsableAnnualRows(hit.annualData)) return null;
  const age = Math.floor(
    (Date.now() - new Date(cache.fetchedDate).getTime()) /
      (24 * 3600 * 1000),
  );
  if (age > maxAgeDays) return null;
  return hit;
}

function saveCacheEntry(entry: CachedSECEntry): void {
  const cache = readFullCache();
  const entries = cache?.entries ?? [];
  const next = entries.filter(
    (e) => e.symbol.toUpperCase() !== entry.symbol.toUpperCase(),
  );
  next.push(entry);
  fs.writeFileSync(
    CACHE_PATH,
    JSON.stringify({ fetchedDate: todayStr(), entries: next }, null, 2),
  );
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": secUserAgent(),
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
      (entry) => entry.ticker.toUpperCase() === upper,
    ) || null;

  if (!match) return null;

  return match.cik_str.toString().padStart(10, "0");
}

type FactPoint = {
  end?: string;
  val?: number;
  form?: string;
  fy?: number;
  fp?: string;
  filed?: string;
};

type CompanyFacts = {
  facts?: {
    [taxonomy: string]: {
      [concept: string]: {
        units?: {
          [unit: string]: FactPoint[];
        };
      };
    };
  };
};

function pointScore(p: FactPoint): number {
  const endT = p.end ? new Date(p.end).getTime() : 0;
  const filedT = p.filed ? new Date(p.filed).getTime() : 0;
  return Math.max(endT, filedT);
}

function extractAnnualSeries(
  facts: CompanyFacts,
  concept: string,
): { fiscalYear: string; value: number }[] {
  const container = facts.facts?.["us-gaap"]?.[concept];
  if (!container?.units) return [];

  const bestPerFY = new Map<
    string,
    { score: number; value: number }
  >();

  for (const unit of Object.values(container.units)) {
    for (const point of unit) {
      if (typeof point.val !== "number" || !Number.isFinite(point.val)) {
        continue;
      }
      const fyNum = typeof point.fy === "number" ? point.fy : null;
      const fiscalYear =
        fyNum != null
          ? String(fyNum)
          : point.end
            ? new Date(point.end).getUTCFullYear().toString()
            : null;
      if (!fiscalYear) continue;

      const score = pointScore(point);
      const prev = bestPerFY.get(fiscalYear);
      if (!prev || score >= prev.score) {
        bestPerFY.set(fiscalYear, { score, value: point.val });
      }
    }
  }

  return Array.from(bestPerFY.entries())
    .map(([fiscalYear, { value }]) => ({ fiscalYear, value }))
    .sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear));
}

function firstNonEmptySeries(
  facts: CompanyFacts,
  concepts: string[],
): { fiscalYear: string; value: number }[] {
  for (const c of concepts) {
    const s = extractAnnualSeries(facts, c);
    if (s.length > 0) return s;
  }
  return [];
}

const REVENUE_CONCEPTS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "SalesRevenueNet",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "OperatingRevenues",
  "InsuranceServiceRevenue",
];

const CAPEX_CONCEPTS = [
  "PaymentsToAcquirePropertyPlantAndEquipment",
  "PaymentsForCapitalImprovements",
  "PaymentsForProceedsFromProductiveAssets",
];

const DA_CONCEPTS = [
  "DepreciationDepletionAndAmortization",
  "DepreciationAndAmortization",
];

const OCF_CONCEPTS = [
  "NetCashProvidedByUsedInOperatingActivities",
  "CashProvidedByUsedInOperatingActivities",
];

async function fetchFromSEC(symbol: string): Promise<SECFinancials | null> {
  const cik = await getCIKForSymbol(symbol);
  if (!cik) return null;

  const factsUrl = `${COMPANY_FACTS_BASE}/CIK${cik}.json`;
  const facts = await fetchJSON<CompanyFacts>(factsUrl);

  const revenues = firstNonEmptySeries(facts, REVENUE_CONCEPTS);
  const capex = firstNonEmptySeries(facts, CAPEX_CONCEPTS);
  const depreciation = firstNonEmptySeries(facts, DA_CONCEPTS);
  const assetsCurrent = extractAnnualSeries(facts, "AssetsCurrent");
  const liabilitiesCurrent = extractAnnualSeries(
    facts,
    "LiabilitiesCurrent",
  );
  const operatingCf = firstNonEmptySeries(facts, OCF_CONCEPTS);

  const years = new Set<string>();
  [
    revenues,
    capex,
    depreciation,
    assetsCurrent,
    liabilitiesCurrent,
    operatingCf,
  ].forEach((series) => series.forEach((p) => years.add(p.fiscalYear)));

  const annualData: SECAnnualFinancialRow[] = Array.from(years)
    .sort((a, b) => Number(b) - Number(a))
    .slice(0, 8)
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
        ebitda: null,
        capex: cx,
        depreciation: dep,
        currentAssets: ca,
        currentLiabilities: cl,
        workingCapital,
        operatingCashflow: ocf,
      };
    });

  return {
    symbol: symbol.toUpperCase(),
    cik,
    annualData,
    dataSource: "sec",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const upperSymbol = symbol.toUpperCase();
  const bypassCache = searchParams.get("refresh") === "1";

  try {
    if (!bypassCache) {
      const stale = getCachedEntry(upperSymbol, 14);
      if (stale) {
        return NextResponse.json(stale);
      }
    }

    let result: SECFinancials | null = null;

    try {
      result = await fetchFromSEC(upperSymbol);
    } catch (e) {
      console.error("SEC fetch failed:", e);
      result = null;
    }

    if (!hasUsableAnnualRows(result?.annualData)) {
      const yahoo = await getAnnualFinancialsFromYahoo(upperSymbol);
      if (yahoo && hasUsableAnnualRows(yahoo.annualData)) {
        result = {
          ...yahoo,
          cik:
            result?.cik && result.cik.length > 0 ? result.cik : yahoo.cik,
        };
      }
    }

    if (!result || !hasUsableAnnualRows(result.annualData)) {
      return NextResponse.json(
        {
          error: "No annual fundamentals available",
          symbol: upperSymbol,
          annualData: [],
          cik: result?.cik ?? "",
        },
        { status: 404 },
      );
    }

    saveCacheEntry(result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("SEC financials API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch financials" },
      { status: 500 },
    );
  }
}

/**
 * World Bank Open Data API (v2)
 * https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation
 */

const WB_BASE = "https://api.worldbank.org/v2";

/** Selector codes exposed in the UI → World Bank `country/{id}` path segment. */
const COUNTRY_ID: Record<string, string> = {
  US: "US",
  GB: "GB",
  EU: "EUU",
  CN: "CN",
  JP: "JP",
  IN: "IN",
  BR: "BR",
  WLD: "WLD",
};

export const WORLD_BANK_COUNTRY_CODES = [
  "US",
  "GB",
  "EU",
  "CN",
  "JP",
  "IN",
  "BR",
  "WLD",
] as const;

export type WorldBankCountryCode = (typeof WORLD_BANK_COUNTRY_CODES)[number];

export interface WorldBankSeries {
  country: string;
  indicator: string;
  values: { year: number; value: number }[];
  source: "World Bank";
  sourceUrl: string;
}

const CACHE = { next: { revalidate: 86400 } } as const;

function indicatorUrl(indicatorCode: string): string {
  return `https://data.worldbank.org/indicator/${indicatorCode}`;
}

function resolveCountryId(selectorCode: string): string | null {
  const key = selectorCode.trim().toUpperCase();
  return COUNTRY_ID[key] ?? null;
}

function parseLatestYears(
  json: unknown,
  maxYears: number
): { year: number; value: number }[] {
  if (!Array.isArray(json) || !Array.isArray(json[1])) return [];
  const rows = json[1] as Array<{
    date: string;
    value: string | number | null;
  }>;

  const parsed: { year: number; value: number }[] = [];
  for (const r of rows) {
    if (r.value == null || r.value === "") continue;
    const y = parseInt(r.date, 10);
    const v = Number(r.value);
    if (!Number.isFinite(y) || !Number.isFinite(v)) continue;
    parsed.push({ year: y, value: v });
  }

  parsed.sort((a, b) => b.year - a.year);
  return parsed.slice(0, maxYears).sort((a, b) => a.year - b.year);
}

async function fetchIndicatorSeries(
  selectorCode: string,
  indicator: string,
  maxYears = 5
): Promise<WorldBankSeries | null> {
  const wbId = resolveCountryId(selectorCode);
  if (!wbId) return null;

  const url = `${WB_BASE}/country/${encodeURIComponent(wbId)}/indicator/${encodeURIComponent(
    indicator
  )}?format=json&per_page=20&sort_order=desc`;

  try {
    const res = await fetch(url, CACHE);
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const values = parseLatestYears(json, maxYears);
    if (values.length === 0) {
      return {
        country: selectorCode.trim().toUpperCase(),
        indicator,
        values: [],
        source: "World Bank",
        sourceUrl: indicatorUrl(indicator),
      };
    }
    return {
      country: selectorCode.trim().toUpperCase(),
      indicator,
      values,
      source: "World Bank",
      sourceUrl: indicatorUrl(indicator),
    };
  } catch (e) {
    console.warn(`[worldbank] ${indicator} for ${selectorCode}:`, e);
    return null;
  }
}

/** GDP growth (annual %). Indicator NY.GDP.MKTP.KD.ZG — latest 5 years. */
export async function getGdpGrowth(
  countryCode = "WLD"
): Promise<WorldBankSeries | null> {
  return fetchIndicatorSeries(countryCode, "NY.GDP.MKTP.KD.ZG");
}

/** Inflation, consumer prices (annual %). FP.CPI.TOTL.ZG — latest 5 years. */
export async function getInflation(
  countryCode = "WLD"
): Promise<WorldBankSeries | null> {
  return fetchIndicatorSeries(countryCode, "FP.CPI.TOTL.ZG");
}

/** Unemployment, total (% of labor force). SL.UEM.TOTL.ZS — latest 5 years. */
export async function getUnemployment(
  countryCode = "WLD"
): Promise<WorldBankSeries | null> {
  return fetchIndicatorSeries(countryCode, "SL.UEM.TOTL.ZS");
}

export function isValidWorldBankCountry(code: string): code is WorldBankCountryCode {
  return (WORLD_BANK_COUNTRY_CODES as readonly string[]).includes(
    code.trim().toUpperCase()
  );
}

/**
 * Financial Modeling Prep (FMP) API client — fundamentals and statements.
 * https://financialmodelingprep.com/developer/docs
 */

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

/** FMP payload with source metadata (serializes correctly for JSON responses). */
export type FmpData<T> = { data: T; _source: "FMP"; _sourceUrl: string };

function fmpStatementsUrl(symbol: string): string {
  return `https://financialmodelingprep.com/financial-statements/${encodeURIComponent(symbol)}`;
}

function getApiKey(): string | null {
  const k = process.env.FMP_API_KEY?.trim();
  return k || null;
}

function isFmpErrorPayload(json: unknown): boolean {
  if (!Array.isArray(json) || json.length === 0) return false;
  const first = json[0];
  return (
    typeof first === "object" &&
    first !== null &&
    "Error Message" in (first as Record<string, unknown>)
  );
}

function wrapFmp<T>(data: T, symbol: string): FmpData<T> {
  return {
    data,
    _source: "FMP",
    _sourceUrl: fmpStatementsUrl(symbol),
  };
}

async function fetchFmpArray(
  path: string,
  symbol: string,
  label: string
): Promise<FmpData<unknown[]> | null> {
  const sym = symbol.trim().toUpperCase();
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(`[fmp] FMP_API_KEY is not set; skipping ${label}`);
    return null;
  }

  const url = `${FMP_BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[fmp] HTTP ${res.status} for ${label}`);
      return null;
    }
    const json: unknown = await res.json();
    if (isFmpErrorPayload(json)) {
      console.warn(`[fmp] API error for ${label}`);
      return null;
    }
    if (!Array.isArray(json)) {
      return null;
    }
    return wrapFmp(json, sym);
  } catch (e) {
    console.warn(`[fmp] ${label} failed:`, e);
    return null;
  }
}

/** Income statement (annual periods, newest first). */
export function getIncomeStatement(
  symbol: string,
  limit = 4
): Promise<FmpData<unknown[]> | null> {
  const sym = symbol.trim().toUpperCase();
  return fetchFmpArray(
    `/income-statement/${encodeURIComponent(sym)}?limit=${limit}`,
    symbol,
    "income statement"
  );
}

/** Balance sheet (annual periods, newest first). */
export function getBalanceSheet(
  symbol: string,
  limit = 4
): Promise<FmpData<unknown[]> | null> {
  const sym = symbol.trim().toUpperCase();
  return fetchFmpArray(
    `/balance-sheet-statement/${encodeURIComponent(sym)}?limit=${limit}`,
    symbol,
    "balance sheet"
  );
}

/** Cash flow statement (annual periods, newest first). */
export function getCashFlow(
  symbol: string,
  limit = 4
): Promise<FmpData<unknown[]> | null> {
  const sym = symbol.trim().toUpperCase();
  return fetchFmpArray(
    `/cash-flow-statement/${encodeURIComponent(sym)}?limit=${limit}`,
    symbol,
    "cash flow"
  );
}

/** Key metrics TTM (typically one row). */
export function getKeyMetrics(symbol: string): Promise<FmpData<unknown[]> | null> {
  const sym = symbol.trim().toUpperCase();
  return fetchFmpArray(`/key-metrics-ttm/${encodeURIComponent(sym)}`, symbol, "key metrics");
}

/** Financial ratios TTM. */
export function getFinancialRatios(symbol: string): Promise<FmpData<unknown[]> | null> {
  const sym = symbol.trim().toUpperCase();
  return fetchFmpArray(`/ratios-ttm/${encodeURIComponent(sym)}`, symbol, "ratios");
}

/** Company profile. */
export function getCompanyProfile(symbol: string): Promise<FmpData<unknown[]> | null> {
  const sym = symbol.trim().toUpperCase();
  return fetchFmpArray(`/profile/${encodeURIComponent(sym)}`, symbol, "profile");
}

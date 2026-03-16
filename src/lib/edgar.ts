const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_BASE = "https://data.sec.gov/submissions";

type FilingFormType = "10-K" | "10-Q";

export interface EdgarFilingSource {
  symbol: string;
  formType: FilingFormType;
  /** Calendar year, e.g. 2024. Optional – if omitted, uses most recent filing of that type. */
  year?: number;
  /**
   * Quarter number for 10-Q (1–4). Optional – if omitted, uses most recent 10-Q
   * in the given year (or overall if year is also omitted).
   */
  quarter?: 1 | 2 | 3 | 4;
}

export interface EdgarFilingMeta {
  symbol: string;
  cik: string;
  companyName: string;
  form: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string;
  url: string;
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

async function getCIK(symbol: string): Promise<string | null> {
  type TickerEntry = { cik_str: number; ticker: string };
  const tickers = await fetchJSON<Record<string, TickerEntry>>(TICKERS_URL);
  const match = Object.values(tickers).find(
    (e) => e.ticker.toUpperCase() === symbol.toUpperCase(),
  );
  return match ? match.cik_str.toString().padStart(10, "0") : null;
}

function pickQuarterFromDate(dateStr: string): 1 | 2 | 3 | 4 {
  const month = Number(dateStr.slice(5, 7));
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

function matchesPeriod(
  filingDate: string,
  source: EdgarFilingSource,
): boolean {
  const { year, quarter, formType } = source;
  if (!year && !quarter) return true;

  const fYear = Number(filingDate.slice(0, 4));
  if (year && fYear !== year) return false;

  if (formType === "10-Q" && quarter) {
    const fQuarter = pickQuarterFromDate(filingDate);
    return fQuarter === quarter;
  }

  return true;
}

export async function fetchEdgarFilingText(
  source: EdgarFilingSource,
): Promise<{ meta: EdgarFilingMeta; text: string }> {
  const symbol = source.symbol.toUpperCase();
  const cik = await getCIK(symbol);
  if (!cik) {
    throw new Error(`CIK not found for symbol ${symbol}`);
  }

  const cikNum = cik.replace(/^0+/, "");

  const data = await fetchJSON<{
    cik: string;
    entityType: string;
    name: string;
    filings: {
      recent: {
        form: string[];
        filingDate: string[];
        primaryDocument: string[];
        accessionNumber: string[];
        primaryDocDescription: string[];
      };
    };
  }>(`${SUBMISSIONS_BASE}/CIK${cik}.json`);

  const recent = data.filings.recent;
  const targetForm = source.formType;

  let chosenIndex = -1;
  for (let i = 0; i < recent.form.length; i++) {
    const form = recent.form[i];
    if (form !== targetForm && form !== `${targetForm}/A`) continue;
    const filingDate = recent.filingDate[i];
    if (!matchesPeriod(filingDate, source)) continue;
    chosenIndex = i;
    break;
  }

  if (chosenIndex === -1) {
    // Fall back to the most recent filing of that type if period-specific search failed
    for (let i = 0; i < recent.form.length; i++) {
      const form = recent.form[i];
      if (form === targetForm || form === `${targetForm}/A`) {
        chosenIndex = i;
        break;
      }
    }
  }

  if (chosenIndex === -1) {
    throw new Error(
      `No filings found for ${symbol} with form ${targetForm} and requested period`,
    );
  }

  const accession = recent.accessionNumber[chosenIndex].replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accession}/${recent.primaryDocument[chosenIndex]}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Capital-Markets-Dashboard/1.0 (contact: example@example.com)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch filing document: ${res.status} for ${url}`);
  }

  const raw = await res.text();

  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  const meta: EdgarFilingMeta = {
    symbol,
    cik: cikNum,
    companyName: data.name,
    form: recent.form[chosenIndex],
    filingDate: recent.filingDate[chosenIndex],
    accessionNumber: recent.accessionNumber[chosenIndex],
    primaryDocument: recent.primaryDocument[chosenIndex],
    url,
  };

  return { meta, text };
}


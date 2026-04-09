import { NextRequest, NextResponse } from "next/server";
import { getEdgarArchivesDocumentUrl } from "@/lib/edgar";

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_BASE = "https://data.sec.gov/submissions";

interface Filing {
  form: string;
  filingDate: string;
  description: string;
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
  if (!res.ok) throw new Error(`SEC API error ${res.status} for ${url}`);
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

const RELEVANT_FORMS = new Set([
  "10-K",
  "10-Q",
  "8-K",
  "10-K/A",
  "10-Q/A",
  "8-K/A",
  "DEF 14A",
  "S-1",
  "S-1/A",
  "20-F",
  "6-K",
  "4",
  "SC 13D",
  "SC 13G",
  "13F-HR",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const cik = await getCIK(symbol);
    if (!cik) {
      return NextResponse.json(
        { error: "CIK not found for symbol" },
        { status: 404 },
      );
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
    const filings: Filing[] = [];

    for (let i = 0; i < recent.form.length && filings.length < 50; i++) {
      const form = recent.form[i];
      if (!RELEVANT_FORMS.has(form)) continue;

      filings.push({
        form,
        filingDate: recent.filingDate[i],
        description: recent.primaryDocDescription[i] || form,
        accessionNumber: recent.accessionNumber[i],
        primaryDocument: recent.primaryDocument[i],
        url: getEdgarArchivesDocumentUrl(
          cikNum,
          recent.accessionNumber[i],
          recent.primaryDocument[i],
        ),
      });
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      cik: cikNum,
      companyName: data.name,
      filings,
    });
  } catch (error) {
    console.error("SEC filings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SEC filings" },
      { status: 500 },
    );
  }
}

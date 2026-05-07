import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// ---------------------------------------------------------------------------
// Per–symbol-set cache — each distinct `symbols` query string is cached
// independently so concurrent pages don’t clobber each other.
// ---------------------------------------------------------------------------
const CACHE_TTL = 18_000; // 18 s — slightly under the 20 s client interval

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const YAHOO_QUOTE_BATCH_SIZE = 50;

export interface Quote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  name: string | null;
  marketState: string | null;
}

export type QuoteMap = Record<string, Quote>;

interface CacheEntry {
  data: QuoteMap;
  fetchedAt: number;
}

const cacheStore = new Map<string, CacheEntry>();

function emptyQuote(sym: string): Quote {
  return {
    symbol: sym,
    price: null,
    change: null,
    changePercent: null,
    name: null,
    marketState: null,
  };
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

type YahooQuoteRow = {
  symbol?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketState?: string;
};

async function fetchQuotes(symbols: string[]): Promise<QuoteMap> {
  const map: QuoteMap = {};
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += YAHOO_QUOTE_BATCH_SIZE) {
    chunks.push(symbols.slice(i, i + YAHOO_QUOTE_BATCH_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const rows = await yf.quote(chunk, undefined, {
          validateResult: false,
        });
        const list: YahooQuoteRow[] = Array.isArray(rows)
          ? rows
          : rows
            ? [rows as YahooQuoteRow]
            : [];
        for (const q of list) {
          const sym = q.symbol;
          if (!sym) continue;
          map[sym] = {
            symbol: sym,
            price: numOrNull(q.regularMarketPrice),
            change: numOrNull(q.regularMarketChange),
            changePercent: numOrNull(q.regularMarketChangePercent),
            name: typeof q.shortName === "string" ? q.shortName : null,
            marketState: typeof q.marketState === "string" ? q.marketState : null,
          };
        }
      } catch {
        for (const sym of chunk) {
          if (!map[sym]) map[sym] = emptyQuote(sym);
        }
      }
    })
  );

  for (const sym of symbols) {
    if (!map[sym]) map[sym] = emptyQuote(sym);
  }
  return map;
}

function cacheKeyFor(symbols: string[]): string {
  return [...symbols].sort().join(",");
}

// ---------------------------------------------------------------------------
// GET /api/quotes?symbols=AAPL,MSFT,SPY
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
  }

  const now = Date.now();
  const key = cacheKeyFor(symbols);
  const cached = cacheStore.get(key);

  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "no-store",
        "X-Cache": "HIT",
        "X-Cache-Age": String(Math.round((now - cached.fetchedAt) / 1000)),
      },
    });
  }

  try {
    const data = await fetchQuotes(symbols);
    cacheStore.set(key, { data, fetchedAt: now });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store", "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("[/api/quotes] fetch error:", err);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: { "Cache-Control": "no-store", "X-Cache": "STALE" },
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 502 }
    );
  }
}

import { unstable_cache } from "next/cache";
import YahooFinance from "yahoo-finance2";
import type {
  StockQuote,
  TickerItem,
  NewsArticle,
  HistoricalDataPoint,
  SearchResult,
  QuoteSummaryData,
  QuoteSummaryHeavyPatch,
  MarketMoverQuote,
  MarketMoversBoard,
} from "./types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Yahoo v7 quote supports comma-joined symbols; batch to avoid N parallel HTTP calls. */
const YAHOO_QUOTE_BATCH_SIZE = 50;

function yahooOptionalNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

/**
 * Default header ticker when the user has not chosen portfolio/custom (or is logged out).
 * Keep index symbols in sync with `INDEX_SYMBOLS` in `MarketOverview.tsx` for dashboard index cards.
 */
export const DEFAULT_TICKER_SYMBOLS = [
  "^GSPC",
  "^DJI",
  "^IXIC",
  "^VIX",
  "^GSPTSE",
  "GC=F",
  "CL=F",
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
  "BRK-B",
  "ORCL",
  "BTC-USD",
  "TSM",
  "ASML",
  "AVGO",
  "MU",
  "SNPS",
];

/** Short labels for indices, futures, and ETFs where Yahoo names are noisy. */
const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^DJI": "Dow Jones",
  "^IXIC": "Nasdaq Composite",
  "^VIX": "VIX",
  "^GSPTSE": "S&P/TSX",
  "GC=F": "Gold",
  "CL=F": "WTI Crude",
  "BTC-USD": "Bitcoin",
};

const INDEX_CURRENCIES: Record<string, string> = {
  "^GSPTSE": "CAD",
};

type YahooQuoteRow = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketPreviousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  trailingPE?: number;
  currency?: string;
  exchange?: unknown;
  fullExchangeName?: unknown;
};

/** One or more Yahoo quote API calls (chunked). Same data as N× single `quote()`, far fewer round trips. */
async function fetchQuotesBatch(symbols: string[]): Promise<YahooQuoteRow[]> {
  if (symbols.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += YAHOO_QUOTE_BATCH_SIZE) {
    chunks.push(symbols.slice(i, i + YAHOO_QUOTE_BATCH_SIZE));
  }
  const parts = await Promise.all(
    chunks.map((chunk) =>
      yf.quote(chunk, undefined, { validateResult: false })
    )
  );
  const flat: YahooQuoteRow[] = [];
  for (const p of parts) {
    if (Array.isArray(p)) {
      for (const item of p) flat.push(item as YahooQuoteRow);
    } else if (p) {
      flat.push(p as YahooQuoteRow);
    }
  }
  return flat;
}

export async function getExchangeRates(
  currencies: string[]
): Promise<Record<string, number>> {
  const rates: Record<string, number> = { USD: 1 };
  const needed = [...new Set(currencies.filter((c) => c !== "USD"))];
  if (needed.length === 0) return rates;

  /** One batched Yahoo quote call per chunk — avoids N parallel FX round trips (major win for ticker tape). */
  const fxSymbols = needed.map((cur) => `${cur}USD=X`);
  try {
    const rows = await fetchQuotesBatch(fxSymbols);
    const bySym = new Map(rows.map((q) => [q.symbol, q]));
    for (const cur of needed) {
      const sym = `${cur}USD=X`;
      const q = bySym.get(sym);
      rates[cur] = q?.regularMarketPrice ?? 1;
    }
  } catch {
    await Promise.all(
      needed.map(async (cur) => {
        try {
          const fxQuote = await yf.quote(`${cur}USD=X`, undefined, {
            validateResult: false,
          });
          if (fxQuote && !Array.isArray(fxQuote)) {
            rates[cur] = fxQuote.regularMarketPrice ?? 1;
          } else {
            rates[cur] = 1;
          }
        } catch {
          rates[cur] = 1;
        }
      })
    );
  }

  return rates;
}

export function getIndexCurrency(symbol: string): string | undefined {
  return INDEX_CURRENCIES[symbol];
}

function stockQuoteFromYahoo(quote: YahooQuoteRow, fallbackSymbol: string): StockQuote {
  const q = quote as Record<string, unknown>;
  return {
    symbol: quote.symbol,
    exchange: quote.exchange != null ? String(quote.exchange) : "",
    exchangeName:
      quote.fullExchangeName != null ? String(quote.fullExchangeName) : "",
    shortName: quote.shortName || quote.longName || fallbackSymbol,
    regularMarketPrice: quote.regularMarketPrice ?? 0,
    regularMarketChange: quote.regularMarketChange ?? 0,
    regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
    regularMarketVolume: quote.regularMarketVolume ?? 0,
    regularMarketOpen: quote.regularMarketOpen ?? 0,
    regularMarketDayHigh: quote.regularMarketDayHigh ?? 0,
    regularMarketDayLow: quote.regularMarketDayLow ?? 0,
    regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
    marketCap: quote.marketCap ?? 0,
    trailingPE: quote.trailingPE ?? 0,
    currency: quote.currency ?? "USD",
    marketState:
      q.marketState != null ? String(q.marketState) : undefined,
    preMarketPrice: yahooOptionalNum(q.preMarketPrice),
    preMarketChange: yahooOptionalNum(q.preMarketChange),
    preMarketChangePercent: yahooOptionalNum(q.preMarketChangePercent),
    postMarketPrice: yahooOptionalNum(q.postMarketPrice),
    postMarketChange: yahooOptionalNum(q.postMarketChange),
    postMarketChangePercent: yahooOptionalNum(q.postMarketChangePercent),
  };
}

function dedupeTickerSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of symbols) {
    const s = raw.trim().toUpperCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function tickerCacheKey(symbols: string[]): string {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()))].sort().join(",");
}

function lookupQuoteRow(
  bySym: Map<string, YahooQuoteRow>,
  symbol: string
): YahooQuoteRow | undefined {
  const u = symbol.toUpperCase();
  let q = bySym.get(u);
  if (q) return q;
  if (u.startsWith("^")) q = bySym.get(u.slice(1));
  if (q) return q;
  if (!u.startsWith("^")) q = bySym.get("^" + u);
  return q;
}

async function fetchTickerDataUncached(symbols: string[]): Promise<TickerItem[]> {
  if (symbols.length === 0) return [];
  let quotes: YahooQuoteRow[];
  try {
    quotes = await fetchQuotesBatch([...symbols]);
  } catch {
    quotes = [];
  }

  const bySym = new Map<string, YahooQuoteRow>();
  for (const q of quotes) {
    const s = q.symbol.toUpperCase();
    bySym.set(s, q);
  }

  // Batch often resolves without throwing but returns no rows (Yahoo / rate limits). Fill gaps per symbol.
  for (const symbol of symbols) {
    if (lookupQuoteRow(bySym, symbol)) continue;
    try {
      const q = await yf.quote(symbol, undefined, { validateResult: false });
      if (q && !Array.isArray(q)) {
        const s = q.symbol.toUpperCase();
        bySym.set(s, q);
      }
    } catch {
      /* skip */
    }
  }

  const rawResults = symbols.map((symbol) => {
    const quote = lookupQuoteRow(bySym, symbol);
    if (!quote) return null;
    return {
      symbol,
      name:
        SYMBOL_DISPLAY_NAMES[symbol] ||
        quote.shortName ||
        quote.longName ||
        symbol,
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      currency: quote.currency ?? "USD",
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  const currencies = rawResults.map((r) => r.currency);
  const fxRates = await getExchangeRates(currencies);

  return rawResults.map((r) => {
    const rate = fxRates[r.currency] ?? 1;
    return {
      symbol: r.symbol,
      name: r.name,
      price: r.price,
      change: r.change,
      changePercent: r.changePercent,
      currency: r.currency,
      priceUSD: r.price * rate,
      changeUSD: r.change * rate,
    };
  });
}

/** Short cache: tape polls every 15s; cache key includes symbol set (per default / user list). */
export async function getTickerData(symbols: string[]): Promise<TickerItem[]> {
  const normalized = dedupeTickerSymbols(symbols);
  if (normalized.length === 0) return [];
  const key = tickerCacheKey(normalized);
  return unstable_cache(
    () => fetchTickerDataUncached(normalized),
    ["yahoo-ticker-tape", key],
    { revalidate: 12 }
  )();
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const quote = await yf.quote(symbol, undefined, { validateResult: false });
    if (!quote || Array.isArray(quote)) return null;
    return stockQuoteFromYahoo(quote, symbol);
  } catch {
    return null;
  }
}

export async function getMultipleQuotes(
  symbols: string[]
): Promise<StockQuote[]> {
  if (symbols.length === 0) return [];
  const unique = [...new Set(symbols)];
  try {
    const batch = await fetchQuotesBatch(unique);
    const bySym = new Map(batch.map((q) => [q.symbol, q]));
    return symbols
      .map((s) => {
        const q = bySym.get(s);
        if (!q) return null;
        return stockQuoteFromYahoo(q, s);
      })
      .filter((q): q is StockQuote => q != null);
  } catch {
    const quotes = await Promise.all(symbols.map((s) => getQuote(s)));
    return quotes.filter((q): q is StockQuote => q != null);
  }
}

const SECTOR_FETCH_CONCURRENCY = 6;

async function fetchSectorFromYahoo(symbol: string): Promise<string> {
  try {
    const result = (await yf.quoteSummary(
      symbol,
      { modules: ["assetProfile", "summaryProfile"] },
      { validateResult: false }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    const profile = result.assetProfile;
    const summary = result.summaryProfile;
    const sector = (profile?.sector || summary?.sector || "").trim();
    return typeof sector === "string" ? sector : "";
  } catch {
    return "";
  }
}

/**
 * Yahoo sector labels for a set of symbols (deduped). Batched to limit parallel requests.
 * Cached per unique symbol set for 24h — sector metadata changes rarely.
 */
export async function getSectorsForSymbols(
  symbols: string[]
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      symbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0)
    ),
  ].sort();
  if (unique.length === 0) return new Map();

  return unstable_cache(
    async () => {
      const map = new Map<string, string>();
      for (let i = 0; i < unique.length; i += SECTOR_FETCH_CONCURRENCY) {
        const chunk = unique.slice(i, i + SECTOR_FETCH_CONCURRENCY);
        const results = await Promise.all(
          chunk.map(async (sym) => {
            const sector = await fetchSectorFromYahoo(sym);
            return [sym, sector] as const;
          })
        );
        for (const [sym, sector] of results) {
          map.set(sym, sector);
        }
      }
      return map;
    },
    ["yahoo-sectors-batch", unique.join(",")],
    { revalidate: 86_400 }
  )();
}

function getPeriodStart(period: string): { start: Date; interval: "1d" | "1wk" | "1mo" | "5m" | "15m" | "1h" } {
  const now = new Date();
  switch (period) {
    case "1D": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return { start: d, interval: "5m" };
    }
    case "5D": {
      const d = new Date(now);
      d.setDate(d.getDate() - 5);
      return { start: d, interval: "15m" };
    }
    case "1M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return { start: d, interval: "1d" };
    }
    case "3M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { start: d, interval: "1d" };
    }
    case "6M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return { start: d, interval: "1d" };
    }
    case "YTD": {
      const d = new Date(now.getFullYear(), 0, 1);
      return { start: d, interval: "1d" };
    }
    case "5Y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 5);
      return { start: d, interval: "1wk" };
    }
    case "1Y":
    default: {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { start: d, interval: "1d" };
    }
  }
}

export async function getHistoricalData(
  symbol: string,
  period: string
): Promise<HistoricalDataPoint[]> {
  const config = getPeriodStart(period);

  try {
    const result = await yf.chart(symbol, {
      period1: config.start,
      interval: config.interval,
    });

    const isIntraday = config.interval === "5m" || config.interval === "15m" || config.interval === "1h";
    return (result.quotes || [])
      .filter((q) => q.open != null && q.close != null)
      .map((q) => {
        const date = new Date(q.date);
        return {
          time: isIntraday ? Math.floor(date.getTime() / 1000) : date.toISOString().split("T")[0],
          open: q.open!,
          high: q.high!,
          low: q.low!,
          close: q.close!,
          volume: q.volume ?? 0,
        };
      });
  } catch {
    return [];
  }
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim().toUpperCase();
  const tickerPattern = /^[A-Z0-9.-]{1,10}$/;

  try {
    const result = await yf.search(query, { newsCount: 0 });
    let quotes = (result.quotes || [])
      .filter((q: Record<string, unknown>) => q.symbol)
      .slice(0, 8)
      .map((q: Record<string, unknown>) => ({
        symbol: (q.symbol as string).toUpperCase(),
        name: (q.shortname || q.longname || q.symbol) as string,
        exchange: (q.exchange || "") as string,
        type: (q.quoteType || "") as string,
      }));

    if (quotes.length === 0 && tickerPattern.test(trimmed)) {
      const quote = await getQuote(trimmed);
      if (quote) {
        quotes = [{
          symbol: quote.symbol.toUpperCase(),
          name: quote.shortName || quote.symbol,
          exchange: "",
          type: "EQUITY",
        }];
      }
    }

    return quotes;
  } catch {
    if (tickerPattern.test(trimmed)) {
      try {
        const quote = await getQuote(trimmed);
        if (quote) {
          return [{
            symbol: quote.symbol.toUpperCase(),
            name: quote.shortName || quote.symbol,
            exchange: "",
            type: "EQUITY",
          }];
        }
      } catch {
        // fall through to empty
      }
    }
    return [];
  }
}

/** Maps Yahoo heavy-only quoteSummary modules (shared with core + heavy fetch). */
function mapYahooHeavyModules(result: any): QuoteSummaryHeavyPatch {
  const udh = result.upgradeDowngradeHistory;
  const it = result.insiderTransactions;
  const nspa = result.netSharePurchaseActivity;
  return {
    upgradeDowngradeHistory:
      udh?.history
        ?.slice(0, 20)
        .map(
          (h: {
            epochGradeDate?: number | Date;
            firm?: string;
            toGrade?: string;
            fromGrade?: string;
            action?: string;
          }) => ({
            date: new Date(h.epochGradeDate as number | Date).toISOString().split("T")[0],
            firm: h.firm,
            toGrade: String(h.toGrade),
            fromGrade: String(h.fromGrade ?? ""),
            action: String(h.action),
          })
        ) ?? [],
    insiderTransactions:
      it?.transactions?.slice(0, 30).map(
        (t: {
          filerName?: string;
          filerRelation?: string;
          transactionText?: string;
          shares?: number;
          value?: number;
          startDate?: Date | string | number;
          ownership?: string;
        }) => ({
          filerName: t.filerName,
          filerRelation: String(t.filerRelation),
          transactionText: t.transactionText,
          shares: t.shares,
          value: t.value,
          startDate: new Date(t.startDate as string | number | Date).toISOString().split("T")[0],
          ownership: String(t.ownership),
        })
      ) ?? [],
    netSharePurchaseActivity: nspa
      ? {
          buyInfoCount: nspa.buyInfoCount,
          buyInfoShares: nspa.buyInfoShares,
          sellInfoCount: nspa.sellInfoCount,
          sellInfoShares: nspa.sellInfoShares ?? 0,
          netInfoCount: nspa.netInfoCount,
          netInfoShares: nspa.netInfoShares,
          totalInsiderShares: nspa.totalInsiderShares,
        }
      : null,
  };
}

async function fetchQuoteSummaryHeavyFromYahoo(
  symbol: string
): Promise<QuoteSummaryHeavyPatch | null> {
  try {
    const result = (await yf.quoteSummary(
      symbol,
      {
        modules: [
          "upgradeDowngradeHistory",
          "insiderTransactions",
          "netSharePurchaseActivity",
        ],
      },
      { validateResult: false }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    return mapYahooHeavyModules(result);
  } catch (error) {
    console.error("quoteSummary heavy error:", error);
    return null;
  }
}

/** Insiders + rating history — fetched separately to keep core summary fast. */
export async function getQuoteSummaryHeavy(
  symbol: string
): Promise<QuoteSummaryHeavyPatch | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  return unstable_cache(
    async () => fetchQuoteSummaryHeavyFromYahoo(sym),
    ["yahoo-quote-summary-heavy", sym],
    { revalidate: 60 }
  )();
}

/** Uncached Yahoo fetch — see `getQuoteSummary` for caching. */
async function fetchQuoteSummaryFromYahoo(
  symbol: string
): Promise<QuoteSummaryData | null> {
  try {
    // With validateResult: false the library types the payload loosely; keep `any` here
    // so the mapper matches the previous fully-typed quoteSummary result.
    const result = (await yf.quoteSummary(
      symbol,
      {
        modules: [
          "assetProfile",
          "summaryProfile",
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
          "earnings",
          "earningsTrend",
          "recommendationTrend",
          "calendarEvents",
          "price",
        ],
      },
      // Skip strict validation — large payloads are slow and Yahoo sometimes
      // returns extra/missing fields that would reject the whole response.
      { validateResult: false }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;

    const profile = result.assetProfile;
    const summary = result.summaryProfile;
    const detail = result.summaryDetail;
    const stats = result.defaultKeyStatistics;
    const fin = result.financialData;
    const earn = result.earnings;
    const price = result.price;
    const priceRaw = price as Record<string, unknown> | undefined;
    const cal = result.calendarEvents;
    const et = result.earningsTrend;
    const rt = result.recommendationTrend;

    return {
      shortName: price?.shortName || "",
      longName: price?.longName || "",
      symbol: price?.symbol || symbol,
      exchange: price?.exchange != null ? String(price.exchange) : "",
      exchangeName:
        price?.exchangeName != null || price?.fullExchangeName != null
          ? String(price.exchangeName ?? price.fullExchangeName)
          : "",
      longBusinessSummary: profile?.longBusinessSummary || summary?.longBusinessSummary || "",
      sector: profile?.sector || summary?.sector || "",
      industry: profile?.industry || summary?.industry || "",
      website: profile?.website || summary?.website || "",
      fullTimeEmployees: profile?.fullTimeEmployees || summary?.fullTimeEmployees || 0,
      city: profile?.city || summary?.city || "",
      state: profile?.state || summary?.state || "",
      country: profile?.country || summary?.country || "",
      phone: profile?.phone || summary?.phone || "",

      regularMarketPrice: price?.regularMarketPrice ?? 0,
      regularMarketChange: price?.regularMarketChange ?? 0,
      regularMarketChangePercent: price?.regularMarketChangePercent ?? 0,
      regularMarketVolume: price?.regularMarketVolume ?? detail?.regularMarketVolume ?? 0,
      regularMarketOpen: price?.regularMarketOpen ?? detail?.regularMarketOpen ?? 0,
      regularMarketDayHigh: price?.regularMarketDayHigh ?? detail?.regularMarketDayHigh ?? 0,
      regularMarketDayLow: price?.regularMarketDayLow ?? detail?.regularMarketDayLow ?? 0,
      regularMarketPreviousClose: price?.regularMarketPreviousClose ?? detail?.regularMarketPreviousClose ?? 0,
      marketCap: price?.marketCap ?? detail?.marketCap ?? 0,
      currency: price?.currency ?? detail?.currency ?? "USD",
      marketState:
        priceRaw?.marketState != null ? String(priceRaw.marketState) : undefined,
      preMarketPrice: yahooOptionalNum(priceRaw?.preMarketPrice),
      preMarketChange: yahooOptionalNum(priceRaw?.preMarketChange),
      preMarketChangePercent: yahooOptionalNum(priceRaw?.preMarketChangePercent),
      postMarketPrice: yahooOptionalNum(priceRaw?.postMarketPrice),
      postMarketChange: yahooOptionalNum(priceRaw?.postMarketChange),
      postMarketChangePercent: yahooOptionalNum(priceRaw?.postMarketChangePercent),

      trailingPE: detail?.trailingPE ?? stats?.trailingEps ?? 0,
      forwardPE: detail?.forwardPE ?? stats?.forwardPE ?? 0,
      priceToBook: stats?.priceToBook ?? 0,
      priceToSalesTrailing12Months: detail?.priceToSalesTrailing12Months ?? 0,
      enterpriseValue: stats?.enterpriseValue ?? 0,
      enterpriseToRevenue: stats?.enterpriseToRevenue ?? 0,
      enterpriseToEbitda: stats?.enterpriseToEbitda ?? 0,
      pegRatio: stats?.pegRatio ?? 0,
      beta: detail?.beta ?? stats?.beta ?? 0,
      fiftyTwoWeekHigh: detail?.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: detail?.fiftyTwoWeekLow ?? 0,

      totalRevenue: fin?.totalRevenue ?? 0,
      revenuePerShare: fin?.revenuePerShare ?? 0,
      revenueGrowth: fin?.revenueGrowth ?? 0,
      grossMargins: fin?.grossMargins ?? 0,
      ebitdaMargins: fin?.ebitdaMargins ?? 0,
      operatingMargins: fin?.operatingMargins ?? 0,
      profitMargins: fin?.profitMargins ?? stats?.profitMargins ?? 0,
      returnOnAssets: fin?.returnOnAssets ?? 0,
      returnOnEquity: fin?.returnOnEquity ?? 0,
      earningsGrowth: fin?.earningsGrowth ?? 0,
      ebitda: fin?.ebitda ?? 0,
      grossProfits: fin?.grossProfits ?? 0,

      totalDebt: fin?.totalDebt ?? 0,
      totalCash: fin?.totalCash ?? 0,
      totalCashPerShare: fin?.totalCashPerShare ?? 0,
      debtToEquity: fin?.debtToEquity ?? 0,
      currentRatio: fin?.currentRatio ?? 0,
      quickRatio: fin?.quickRatio ?? 0,
      freeCashflow: fin?.freeCashflow ?? 0,
      operatingCashflow: fin?.operatingCashflow ?? 0,

      sharesOutstanding: stats?.sharesOutstanding ?? 0,
      floatShares: stats?.floatShares ?? 0,
      sharesShort: stats?.sharesShort ?? 0,
      shortRatio: stats?.shortRatio ?? 0,
      heldPercentInsiders: stats?.heldPercentInsiders ?? 0,
      heldPercentInstitutions: stats?.heldPercentInstitutions ?? 0,
      bookValue: stats?.bookValue ?? 0,
      trailingEps: stats?.trailingEps ?? 0,
      forwardEps: stats?.forwardEps ?? 0,

      dividendRate: detail?.dividendRate ?? 0,
      dividendYield: detail?.dividendYield ?? 0,
      exDividendDate: detail?.exDividendDate
        ? new Date(detail.exDividendDate).toISOString().split("T")[0]
        : "",
      payoutRatio: detail?.payoutRatio ?? 0,
      fiveYearAvgDividendYield: detail?.fiveYearAvgDividendYield ?? 0,
      trailingAnnualDividendRate: detail?.trailingAnnualDividendRate ?? 0,
      trailingAnnualDividendYield: detail?.trailingAnnualDividendYield ?? 0,
      lastDividendValue: stats?.lastDividendValue ?? 0,
      lastDividendDate: stats?.lastDividendDate
        ? new Date(stats.lastDividendDate).toISOString().split("T")[0]
        : "",

      targetHighPrice: fin?.targetHighPrice ?? 0,
      targetLowPrice: fin?.targetLowPrice ?? 0,
      targetMeanPrice: fin?.targetMeanPrice ?? 0,
      targetMedianPrice: fin?.targetMedianPrice ?? 0,
      recommendationKey: fin?.recommendationKey ?? "",
      recommendationMean: fin?.recommendationMean ?? 0,
      numberOfAnalystOpinions: fin?.numberOfAnalystOpinions ?? 0,

      earningsDate:
        cal?.earnings?.earningsDate?.[0]
          ? new Date(cal.earnings.earningsDate[0]).toISOString().split("T")[0]
          : "",
      earningsCallTimeMs: (() => {
        const rawEarn = cal?.earnings as Record<string, unknown> | undefined;
        const ect = rawEarn?.earningsCallTime;
        if (ect == null) return undefined;
        if (typeof ect === "number" && Number.isFinite(ect)) {
          return ect < 1e12 ? ect * 1000 : ect;
        }
        if (typeof ect === "string" && ect.trim()) {
          const n = Number(ect);
          if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
        }
        return undefined;
      })(),
      dividendPayDate: cal?.dividendDate
        ? new Date(cal.dividendDate).toISOString().split("T")[0]
        : "",

      earningsChartQuarterly:
        earn?.earningsChart?.quarterly?.map((q: { date?: string; actual?: number; estimate?: number }) => ({
          date: q.date,
          actual: q.actual ?? undefined,
          estimate: q.estimate,
        })) ?? [],
      financialsChartYearly:
        earn?.financialsChart?.yearly?.map((y: { date?: string; revenue?: number; earnings?: number }) => ({
          date: y.date,
          revenue: y.revenue,
          earnings: y.earnings,
        })) ?? [],
      financialsChartQuarterly:
        earn?.financialsChart?.quarterly?.map((q: { date?: string; revenue?: number; earnings?: number }) => ({
          date: q.date,
          revenue: q.revenue,
          earnings: q.earnings,
        })) ?? [],

      earningsTrend:
        et?.trend?.map((t: {
          period?: string;
          endDate?: Date | string | number;
          growth?: number;
          earningsEstimate?: Record<string, number | null | undefined>;
          revenueEstimate?: Record<string, number | null | undefined>;
        }) => ({
          period: t.period,
          endDate: t.endDate ? new Date(t.endDate).toISOString().split("T")[0] : null,
          growth: t.growth,
          earningsEstimate: {
            avg: t.earningsEstimate?.avg ?? null,
            low: t.earningsEstimate?.low ?? null,
            high: t.earningsEstimate?.high ?? null,
            yearAgoEps: t.earningsEstimate?.yearAgoEps ?? null,
            numberOfAnalysts: t.earningsEstimate?.numberOfAnalysts ?? null,
            growth: t.earningsEstimate?.growth ?? null,
          },
          revenueEstimate: {
            avg: t.revenueEstimate?.avg ?? null,
            low: t.revenueEstimate?.low ?? null,
            high: t.revenueEstimate?.high ?? null,
            numberOfAnalysts: t.revenueEstimate?.numberOfAnalysts ?? null,
            yearAgoRevenue: t.revenueEstimate?.yearAgoRevenue ?? null,
            growth: t.revenueEstimate?.growth ?? null,
          },
        })) ?? [],

      recommendationTrend:
        rt?.trend?.map((t: {
          period?: string;
          strongBuy?: number;
          buy?: number;
          hold?: number;
          sell?: number;
          strongSell?: number;
        }) => ({
          period: t.period,
          strongBuy: t.strongBuy,
          buy: t.buy,
          hold: t.hold,
          sell: t.sell,
          strongSell: t.strongSell,
        })) ?? [],

      upgradeDowngradeHistory: [],
      companyOfficers:
        profile?.companyOfficers?.map((o: {
          name?: string;
          title?: string;
          age?: number;
          yearBorn?: number;
          totalPay?: number;
          exercisedValue?: number;
          unexercisedValue?: number;
        }) => ({
          name: o.name,
          title: o.title,
          age: o.age,
          yearBorn: o.yearBorn,
          totalPay: o.totalPay,
          exercisedValue: o.exercisedValue,
          unexercisedValue: o.unexercisedValue,
        })) ?? [],

      insiderTransactions: [],
      netSharePurchaseActivity: null,
    };
  } catch (error) {
    console.error("quoteSummary error:", error);
    return null;
  }
}

/** Quote summary with short server cache to absorb repeat loads / dev double-fetch. */
export async function getQuoteSummary(
  symbol: string
): Promise<QuoteSummaryData | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  return unstable_cache(
    async () => fetchQuoteSummaryFromYahoo(sym),
    ["yahoo-quote-summary", sym],
    { revalidate: 20 }
  )();
}

export interface ScreenerQuote {
  symbol: string;
  shortName: string;
  sector: string;
  industry: string;
  marketCap: number;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  trailingPE: number;
  forwardPE: number;
  dividendYield: number;
  beta: number;
  revenueGrowth: number;
  profitMargins: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  recommendationMean: number;
  recommendationKey: string;
  debtToEquity: number;
  currentRatio: number;
  priceToBook: number;
}

export async function getScreenerQuote(symbol: string): Promise<ScreenerQuote | null> {
  try {
    const result = await yf.quoteSummary(
      symbol,
      { modules: ["assetProfile", "summaryDetail", "financialData", "defaultKeyStatistics", "price"] },
      // Skip strict schema validation — Yahoo occasionally returns unexpected
      // shapes for certain fields (especially on non-US or holding-company tickers)
      // which would throw and silently return null.
      { validateResult: false }
    ) as { assetProfile?: Record<string, unknown>; summaryDetail?: Record<string, unknown>; financialData?: Record<string, unknown>; defaultKeyStatistics?: Record<string, unknown>; price?: Record<string, unknown> };

    const profile = result.assetProfile;
    const detail = result.summaryDetail;
    const fin = result.financialData;
    const stats = result.defaultKeyStatistics;
    const price = result.price;

    return {
      symbol: (price?.symbol as string | undefined) || symbol,
      shortName: (price?.shortName as string | undefined) || (price?.longName as string | undefined) || symbol,
      sector: (profile?.sector as string | undefined) || "",
      industry: (profile?.industry as string | undefined) || "",
      marketCap: (price?.marketCap as number | undefined) ?? (detail?.marketCap as number | undefined) ?? 0,
      regularMarketPrice: (price?.regularMarketPrice as number | undefined) ?? 0,
      regularMarketChangePercent: (price?.regularMarketChangePercent as number | undefined) ?? 0,
      trailingPE: (detail?.trailingPE as number | undefined) ?? 0,
      forwardPE: (detail?.forwardPE as number | undefined) ?? (stats?.forwardPE as number | undefined) ?? 0,
      dividendYield: (detail?.dividendYield as number | undefined) ?? 0,
      beta: (detail?.beta as number | undefined) ?? (stats?.beta as number | undefined) ?? 0,
      revenueGrowth: (fin?.revenueGrowth as number | undefined) ?? 0,
      profitMargins: (fin?.profitMargins as number | undefined) ?? (stats?.profitMargins as number | undefined) ?? 0,
      fiftyTwoWeekHigh: (detail?.fiftyTwoWeekHigh as number | undefined) ?? 0,
      fiftyTwoWeekLow: (detail?.fiftyTwoWeekLow as number | undefined) ?? 0,
      recommendationMean: (fin?.recommendationMean as number | undefined) ?? 0,
      recommendationKey: (fin?.recommendationKey as string | undefined) ?? "",
      debtToEquity: (fin?.debtToEquity as number | undefined) ?? 0,
      currentRatio: (fin?.currentRatio as number | undefined) ?? 0,
      priceToBook: (stats?.priceToBook as number | undefined) ?? 0,
    };
  } catch {
    // Fall back to a simple quote call which is more reliable
    try {
      const q = await yf.quote(symbol);
      if (!q?.regularMarketPrice) return null;
      return {
        symbol: q.symbol || symbol,
        shortName: q.shortName || q.longName || symbol,
        sector: "",
        industry: "",
        marketCap: q.marketCap ?? 0,
        regularMarketPrice: q.regularMarketPrice ?? 0,
        regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
        trailingPE: q.trailingPE ?? 0,
        forwardPE: 0,
        dividendYield: q.dividendYield ?? 0,
        beta: q.beta ?? 0,
        revenueGrowth: 0,
        profitMargins: 0,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
        recommendationMean: 0,
        recommendationKey: "",
        debtToEquity: 0,
        currentRatio: 0,
        priceToBook: q.priceToBook ?? 0,
      };
    } catch {
      return null;
    }
  }
}

function yahooCoerceFiniteNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function mapScreenerQuoteToMover(q: Record<string, unknown>): MarketMoverQuote | null {
  const symbol = q.symbol;
  if (typeof symbol !== "string" || !symbol.trim()) return null;
  const price = yahooCoerceFiniteNum(q.regularMarketPrice) ?? 0;
  const pct = yahooCoerceFiniteNum(q.regularMarketChangePercent) ?? 0;
  const vol = yahooCoerceFiniteNum(q.regularMarketVolume) ?? 0;
  const cur = q.currency;
  const tpe = yahooOptionalNum(q.trailingPE);
  const fpe = yahooOptionalNum(q.forwardPE);
  const row: MarketMoverQuote = {
    symbol: symbol.toUpperCase(),
    shortName:
      (typeof q.shortName === "string" && q.shortName) ||
      (typeof q.longName === "string" && q.longName) ||
      symbol,
    regularMarketPrice: price,
    regularMarketChangePercent: pct,
    regularMarketVolume: vol,
    currency: typeof cur === "string" && cur ? cur : "USD",
  };
  if (tpe != null && tpe > 0) row.trailingPE = tpe;
  if (fpe != null && fpe > 0) row.forwardPE = fpe;
  return row;
}

async function fetchScreenerList(
  scrIds: "day_gainers" | "day_losers" | "most_actives" | "undervalued_large_caps",
  count: number
): Promise<MarketMoverQuote[]> {
  try {
    const result = (await yf.screener(
      { scrIds, count, region: "US", lang: "en-US" },
      undefined,
      { validateResult: false }
    )) as { quotes?: Record<string, unknown>[] };
    const quotes = result.quotes || [];
    return quotes
      .map((row) => mapScreenerQuoteToMover(row))
      .filter((r): r is MarketMoverQuote => r !== null);
  } catch (e) {
    console.error(`[yahoo] screener ${scrIds}:`, e);
    return [];
  }
}

async function fetchMarketMoversBoardUncached(
  count: number
): Promise<MarketMoversBoard> {
  const [gainers, losers, mostActive, undervaluedLargeCaps] = await Promise.all([
    fetchScreenerList("day_gainers", count),
    fetchScreenerList("day_losers", count),
    fetchScreenerList("most_actives", count),
    fetchScreenerList("undervalued_large_caps", count),
  ]);
  return { gainers, losers, mostActive, undervaluedLargeCaps };
}

/** Top movers from Yahoo screeners; cached — data is not tick-by-tick. */
export async function getMarketMoversBoard(count = 8): Promise<MarketMoversBoard> {
  const n = Math.min(25, Math.max(4, count));
  return unstable_cache(
    () => fetchMarketMoversBoardUncached(n),
    ["yahoo-market-movers-board", String(n)],
    { revalidate: 90 }
  )();
}

export async function getMarketNews(): Promise<NewsArticle[]> {
  try {
    const result = await yf.search("stock market", {
      quotesCount: 0,
      newsCount: 20,
    });

    return (result.news || []).map((item) => ({
      title: item.title,
      link: item.link,
      source: item.publisher || "Unknown",
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime).toISOString()
        : new Date().toISOString(),
      thumbnail:
        item.thumbnail?.resolutions?.[0]?.url || "",
      summary: "",
    }));
  } catch {
    return [];
  }
}

export async function getSymbolNews(symbol: string): Promise<NewsArticle[]> {
  try {
    const result = await yf.search(symbol, {
      quotesCount: 0,
      newsCount: 5,
    });

    return (result.news || []).map((item: Record<string, unknown>) => ({
      title: (item.title as string) || "",
      link: (item.link as string) || "",
      source: (item.publisher as string) || "Unknown",
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime as number | Date).toISOString()
        : new Date().toISOString(),
      thumbnail: ((item.thumbnail as { resolutions?: { url: string }[] })?.resolutions?.[0]?.url) || "",
      summary: "",
    }));
  } catch {
    return [];
  }
}

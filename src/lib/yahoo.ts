import YahooFinance from "yahoo-finance2";
import type {
  StockQuote,
  TickerItem,
  NewsArticle,
  HistoricalDataPoint,
  SearchResult,
  QuoteSummaryData,
} from "./types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const TICKER_SYMBOLS = [
  "^GSPC",
  "000001.SS",
  "^N225",
  "^FTSE",
  "^GSPTSE",
  "AAPL",
  "MSFT",
  "GOOGL",
  "GOOG",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
  "BRK-B",
  "JPM",
  "V",
  "UNH",
  "XOM",
  "JNJ",
  "WMT",
  // Supply chain / Bottleneck Monitor (also on ticker tape)
  "SNPS",
  "CDNS",
  "ARM",
  "ASML",
  "TSM",
  "MU",
  "AVGO",
  "MRVL",
  "VRT",
  "ETN",
  "SBGSY",
  "CEG",
  "VST",
];

const INDEX_DISPLAY_NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "000001.SS": "SSE Composite",
  "^N225": "Nikkei 225",
  "^FTSE": "FTSE 100",
  "^GSPTSE": "S&P/TSX",
};

const INDEX_CURRENCIES: Record<string, string> = {
  "000001.SS": "CNY",
  "^N225": "JPY",
  "^FTSE": "GBP",
  "^GSPTSE": "CAD",
};

export async function getExchangeRates(
  currencies: string[]
): Promise<Record<string, number>> {
  const rates: Record<string, number> = { USD: 1 };
  const needed = [...new Set(currencies.filter((c) => c !== "USD"))];

  await Promise.all(
    needed.map(async (cur) => {
      try {
        const fxQuote = await yf.quote(`${cur}USD=X`);
        rates[cur] = fxQuote.regularMarketPrice ?? 1;
      } catch {
        rates[cur] = 1;
      }
    })
  );

  return rates;
}

export function getIndexCurrency(symbol: string): string | undefined {
  return INDEX_CURRENCIES[symbol];
}

export async function getTickerData(): Promise<TickerItem[]> {
  const rawResults: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
  }[] = [];

  for (const symbol of TICKER_SYMBOLS) {
    try {
      const quote = await yf.quote(symbol);
      rawResults.push({
        symbol,
        name:
          INDEX_DISPLAY_NAMES[symbol] ||
          quote.shortName ||
          quote.longName ||
          symbol,
        price: quote.regularMarketPrice ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        currency: quote.currency ?? "USD",
      });
    } catch {
      // Skip symbols that fail
    }
  }

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

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const quote = await yf.quote(symbol);
    return {
      symbol: quote.symbol,
      shortName: quote.shortName || quote.longName || symbol,
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
    };
  } catch {
    return null;
  }
}

export async function getMultipleQuotes(
  symbols: string[]
): Promise<StockQuote[]> {
  const results: StockQuote[] = [];
  for (const symbol of symbols) {
    const quote = await getQuote(symbol);
    if (quote) results.push(quote);
  }
  return results;
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

export async function getQuoteSummary(
  symbol: string
): Promise<QuoteSummaryData | null> {
  try {
    const result = await yf.quoteSummary(symbol, {
      modules: [
        "assetProfile",
        "summaryProfile",
        "summaryDetail",
        "defaultKeyStatistics",
        "financialData",
        "earnings",
        "earningsTrend",
        "recommendationTrend",
        "upgradeDowngradeHistory",
        "insiderTransactions",
        "netSharePurchaseActivity",
        "calendarEvents",
        "price",
      ],
    });

    const profile = result.assetProfile;
    const summary = result.summaryProfile;
    const detail = result.summaryDetail;
    const stats = result.defaultKeyStatistics;
    const fin = result.financialData;
    const earn = result.earnings;
    const price = result.price;
    const cal = result.calendarEvents;
    const et = result.earningsTrend;
    const rt = result.recommendationTrend;
    const udh = result.upgradeDowngradeHistory;
    const it = result.insiderTransactions;
    const nspa = result.netSharePurchaseActivity;

    return {
      shortName: price?.shortName || "",
      longName: price?.longName || "",
      symbol: price?.symbol || symbol,
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
      dividendPayDate: cal?.dividendDate
        ? new Date(cal.dividendDate).toISOString().split("T")[0]
        : "",

      earningsChartQuarterly:
        earn?.earningsChart?.quarterly?.map((q) => ({
          date: q.date,
          actual: q.actual ?? undefined,
          estimate: q.estimate,
        })) ?? [],
      financialsChartYearly:
        earn?.financialsChart?.yearly?.map((y) => ({
          date: y.date,
          revenue: y.revenue,
          earnings: y.earnings,
        })) ?? [],
      financialsChartQuarterly:
        earn?.financialsChart?.quarterly?.map((q) => ({
          date: q.date,
          revenue: q.revenue,
          earnings: q.earnings,
        })) ?? [],

      earningsTrend:
        et?.trend?.map((t) => ({
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
        rt?.trend?.map((t) => ({
          period: t.period,
          strongBuy: t.strongBuy,
          buy: t.buy,
          hold: t.hold,
          sell: t.sell,
          strongSell: t.strongSell,
        })) ?? [],

      upgradeDowngradeHistory:
        udh?.history
          ?.slice(0, 20)
          .map((h) => ({
            date: new Date(h.epochGradeDate).toISOString().split("T")[0],
            firm: h.firm,
            toGrade: String(h.toGrade),
            fromGrade: String(h.fromGrade ?? ""),
            action: String(h.action),
          })) ?? [],

      companyOfficers:
        profile?.companyOfficers?.map((o) => ({
          name: o.name,
          title: o.title,
          age: o.age,
          yearBorn: o.yearBorn,
          totalPay: o.totalPay,
          exercisedValue: o.exercisedValue,
          unexercisedValue: o.unexercisedValue,
        })) ?? [],

      insiderTransactions:
        it?.transactions?.slice(0, 30).map((t) => ({
          filerName: t.filerName,
          filerRelation: String(t.filerRelation),
          transactionText: t.transactionText,
          shares: t.shares,
          value: t.value,
          startDate: new Date(t.startDate).toISOString().split("T")[0],
          ownership: String(t.ownership),
        })) ?? [],

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
  } catch (error) {
    console.error("quoteSummary error:", error);
    return null;
  }
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

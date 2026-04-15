import { NextRequest, NextResponse } from "next/server";
import {
  getTickerData,
  getQuote,
  getMultipleQuotes,
  getHistoricalData,
  searchSymbols,
  getQuoteSummary,
  getQuoteSummaryHeavy,
  getSymbolNews,
  getExchangeRates,
  getIndexCurrency,
  getMarketMoversBoard,
} from "@/lib/yahoo";
import { auth } from "@/lib/auth";
import { resolveTickerSymbolsForUser } from "@/lib/tickerTape";

const JSON_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
} as const;

/** Per-user symbol list — private cache only. */
const TICKER_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=12, stale-while-revalidate=48",
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const symbol = searchParams.get("symbol");
  const symbols = searchParams.get("symbols");
  const query = searchParams.get("q");
  const period = searchParams.get("period") || "1Y";

  try {
    switch (action) {
      case "ticker": {
        const session = await auth();
        const symbols = await resolveTickerSymbolsForUser(
          session?.user?.id ?? null
        );
        const data = await getTickerData(symbols);
        return NextResponse.json(data, { headers: TICKER_CACHE_HEADERS });
      }

      case "quote": {
        if (!symbol)
          return NextResponse.json({ error: "Symbol required" }, { status: 400 });
        const data = await getQuote(symbol);
        if (!data)
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(data, { headers: JSON_CACHE_HEADERS });
      }

      case "quotes": {
        if (!symbols)
          return NextResponse.json({ error: "Symbols required" }, { status: 400 });
        const symbolList = symbols.split(",");
        const data = await getMultipleQuotes(symbolList);
        return NextResponse.json(data, { headers: JSON_CACHE_HEADERS });
      }

      case "history": {
        if (!symbol)
          return NextResponse.json({ error: "Symbol required" }, { status: 400 });
        const data = await getHistoricalData(symbol, period);
        const cur = getIndexCurrency(symbol);
        if (cur) {
          const rates = await getExchangeRates([cur]);
          const rate = rates[cur] ?? 1;
          const withUSD = data.map((d) => ({
            ...d,
            closeUSD: d.close * rate,
          }));
          return NextResponse.json(
            { points: withUSD, currency: cur, fxRate: rate },
            { headers: JSON_CACHE_HEADERS }
          );
        }
        return NextResponse.json(
          { points: data, currency: "USD", fxRate: 1 },
          { headers: JSON_CACHE_HEADERS }
        );
      }

      case "search": {
        if (!query)
          return NextResponse.json({ error: "Query required" }, { status: 400 });
        const data = await searchSymbols(query);
        return NextResponse.json(data);
      }

      case "news": {
        if (!symbol)
          return NextResponse.json({ error: "Symbol required" }, { status: 400 });
        const data = await getSymbolNews(symbol);
        return NextResponse.json(data);
      }

      case "summary": {
        if (!symbol)
          return NextResponse.json({ error: "Symbol required" }, { status: 400 });
        const data = await getQuoteSummary(symbol);
        if (!data)
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(data, { headers: JSON_CACHE_HEADERS });
      }

      case "summaryHeavy": {
        if (!symbol)
          return NextResponse.json({ error: "Symbol required" }, { status: 400 });
        const data = await getQuoteSummaryHeavy(symbol);
        return NextResponse.json(
          data ?? {
            upgradeDowngradeHistory: [],
            insiderTransactions: [],
            netSharePurchaseActivity: null,
          },
          { headers: JSON_CACHE_HEADERS }
        );
      }

      case "marketMovers": {
        const n = Math.min(25, Math.max(4, parseInt(searchParams.get("count") || "8", 10) || 8));
        const data = await getMarketMoversBoard(n);
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use: ticker, quote, quotes, history, search, news, summary, summaryHeavy, marketMovers",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Stocks API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

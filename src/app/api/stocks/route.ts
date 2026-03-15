import { NextRequest, NextResponse } from "next/server";
import {
  getTickerData,
  getQuote,
  getMultipleQuotes,
  getHistoricalData,
  searchSymbols,
  getQuoteSummary,
  getSymbolNews,
  getExchangeRates,
  getIndexCurrency,
} from "@/lib/yahoo";

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
        const data = await getTickerData();
        return NextResponse.json(data);
      }

      case "quote": {
        if (!symbol)
          return NextResponse.json({ error: "Symbol required" }, { status: 400 });
        const data = await getQuote(symbol);
        if (!data)
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(data);
      }

      case "quotes": {
        if (!symbols)
          return NextResponse.json({ error: "Symbols required" }, { status: 400 });
        const symbolList = symbols.split(",");
        const data = await getMultipleQuotes(symbolList);
        return NextResponse.json(data);
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
          return NextResponse.json({ points: withUSD, currency: cur, fxRate: rate });
        }
        return NextResponse.json({ points: data, currency: "USD", fxRate: 1 });
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
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: ticker, quote, quotes, history, search, news, summary" },
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

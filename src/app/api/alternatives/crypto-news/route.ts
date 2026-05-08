import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { NewsArticle } from "@/lib/types";
import { CRYPTO_RSS_FEEDS, fetchCryptoRssArticles } from "@/lib/cryptoRss";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Yahoo Finance keys — news search pulls headlines associated with each symbol. */
const CRYPTO_NEWS_SYMBOLS = [
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "XRP-USD",
  "COIN",
  "MSTR",
  "IBIT",
  "DOGE-USD",
  "ADA-USD",
];

async function fetchYahooCryptoNews(): Promise<NewsArticle[]> {
  const allArticles = await Promise.all(
    CRYPTO_NEWS_SYMBOLS.map(async (symbol) => {
      try {
        const result = await yf.search(symbol, { quotesCount: 0, newsCount: 5 });
        return (result.news || []).map((item: Record<string, unknown>) => ({
          title: (item.title as string) || "",
          link: (item.link as string) || "",
          source: (item.publisher as string) || "Yahoo Finance",
          publishedAt:
            item.providerPublishTime
              ? new Date(item.providerPublishTime as number | Date).toISOString()
              : new Date().toISOString(),
          thumbnail:
            (
              (item.thumbnail as { resolutions?: { url: string }[] })
                ?.resolutions?.[0]?.url
            ) || "",
          summary: "",
        }));
      } catch {
        return [];
      }
    })
  );
  return allArticles.flat();
}

export async function GET() {
  try {
    const [yahooArticles, rssArticles] = await Promise.all([
      fetchYahooCryptoNews(),
      fetchCryptoRssArticles(CRYPTO_RSS_FEEDS),
    ]);

    const merged = [...yahooArticles, ...rssArticles];

    const seen = new Set<string>();
    const deduped = merged
      .filter((a) => {
        if (!a.title || !a.link || seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 28);

    return NextResponse.json(deduped);
  } catch (error) {
    console.error("[alternatives/crypto-news]", error);
    return NextResponse.json([], { status: 200 });
  }
}

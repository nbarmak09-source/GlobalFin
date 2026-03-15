import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const NEWS_SYMBOLS = ["GC=F", "CL=F", "NG=F", "VNQ", "ITB", "SI=F"];

export async function GET() {
  try {
    const allArticles = await Promise.all(
      NEWS_SYMBOLS.map(async (symbol) => {
        try {
          const result = await yf.search(symbol, { quotesCount: 0, newsCount: 5 });
          return (result.news || []).map((item: Record<string, unknown>) => ({
            title: (item.title as string) || "",
            link: (item.link as string) || "",
            source: (item.publisher as string) || "Unknown",
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

    const seen = new Set<string>();
    const deduped = allArticles
      .flat()
      .filter((a) => {
        if (!a.title || seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 16);

    return NextResponse.json(deduped);
  } catch (error) {
    console.error("Alternatives news error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

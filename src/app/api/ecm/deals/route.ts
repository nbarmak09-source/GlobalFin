import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import type { NewsArticle } from "@/lib/types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const QUERIES = [
  { q: "IPO stock market listing 2026", tag: "IPO" },
  { q: "merger acquisition deal announced 2026", tag: "M&A" },
  { q: "SPAC merger deal 2026", tag: "SPAC" },
];

export async function GET() {
  try {
    const allArticles: (NewsArticle & { tag: string })[] = [];

    const results = await Promise.allSettled(
      QUERIES.map(async ({ q, tag }) => {
        const result = await yf.search(q, {
          quotesCount: 0,
          newsCount: 8,
        });

        return (result.news || []).map(
          (item: Record<string, unknown>) => ({
            title: (item.title as string) || "",
            link: (item.link as string) || "",
            source: (item.publisher as string) || "Unknown",
            publishedAt: item.providerPublishTime
              ? new Date(
                  item.providerPublishTime as number | Date
                ).toISOString()
              : new Date().toISOString(),
            thumbnail:
              (
                (
                  item.thumbnail as {
                    resolutions?: { url: string }[];
                  }
                )?.resolutions?.[0]?.url
              ) || "",
            summary: "",
            tag,
          })
        );
      })
    );

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        allArticles.push(...r.value);
      }
    });

    const seen = new Set<string>();
    const deduped = allArticles.filter((a) => {
      if (seen.has(a.link)) return false;
      seen.add(a.link);
      return true;
    });

    deduped.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return NextResponse.json(deduped.slice(0, 20));
  } catch (error) {
    console.error("Deals API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deal news" },
      { status: 500 }
    );
  }
}

import type { NewsArticle } from "@/lib/types";
import { fetchRssArticles, type RssFeed } from "@/lib/rssFeeds";

export type CryptoRssFeed = RssFeed;

export const CRYPTO_RSS_FEEDS: CryptoRssFeed[] = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  { url: "https://decrypt.co/feed", source: "Decrypt" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
];

export async function fetchCryptoRssArticles(
  feeds: CryptoRssFeed[],
  timeoutMs = 8000
): Promise<NewsArticle[]> {
  return fetchRssArticles(feeds, timeoutMs);
}

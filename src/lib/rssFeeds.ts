import type { NewsArticle } from "@/lib/types";

function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .trim();
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractFirst(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  if (!m?.[1]) return "";
  return stripTags(m[1]);
}

function extractRssLink(itemBlock: string): string {
  let link = extractFirst(itemBlock, "link").trim();
  if (!link || !link.startsWith("http")) {
    const hrefMatch = itemBlock.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    if (hrefMatch?.[1]) link = hrefMatch[1].trim();
  }
  if (!link || !link.startsWith("http")) {
    const guid = extractFirst(itemBlock, "guid");
    if (guid.startsWith("http")) link = guid;
  }
  return link;
}

/**
 * RSS 2.0 items.
 */
export function parseRssItems(xml: string, feedSource: string): NewsArticle[] {
  const out: NewsArticle[] = [];
  if (!xml.includes("<rss")) return out;

  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const itemBlock of items) {
    let title = extractFirst(itemBlock, "title");
    const link = extractRssLink(itemBlock);
    const pubRaw = extractFirst(itemBlock, "pubDate");
    const descRaw = extractFirst(itemBlock, "description");
    const mediaThumb = itemBlock.match(
      /media:thumbnail[^>]*url=["']([^"']+)["']/i
    );
    const enclosure = itemBlock.match(/<enclosure[^>]*url=["']([^"']+)["']/i);

    title = decodeEntities(title);
    if (!title || !link) continue;

    let publishedAt = new Date().toISOString();
    const parsed = Date.parse(pubRaw);
    if (!Number.isNaN(parsed)) publishedAt = new Date(parsed).toISOString();

    const thumbnail = (mediaThumb?.[1] || enclosure?.[1] || "").trim();

    out.push({
      title,
      link: decodeEntities(link).trim(),
      source: feedSource,
      publishedAt,
      thumbnail,
      summary: descRaw.slice(0, 280),
    });
  }

  return out;
}

function extractAtomLink(entryBlock: string): string {
  const linkTags = entryBlock.match(/<link\b[^>]*\/?>/gi) ?? [];
  for (const tag of linkTags) {
    const href = tag.match(/href=["']([^"']+)["']/i);
    if (href?.[1]) return href[1].trim();
  }
  return "";
}

/**
 * Atom 1.0 entries (e.g. The Guardian).
 */
export function parseAtomItems(xml: string, feedSource: string): NewsArticle[] {
  const out: NewsArticle[] = [];
  if (!xml.includes("<feed")) return out;

  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  for (const block of entries) {
    let title = extractFirst(block, "title");
    const link = extractAtomLink(block);
    const summaryRaw =
      extractFirst(block, "summary") || extractFirst(block, "content");
    const pubRaw =
      extractFirst(block, "published") || extractFirst(block, "updated");

    title = decodeEntities(title);
    if (!title || !link) continue;

    let publishedAt = new Date().toISOString();
    const parsed = Date.parse(pubRaw);
    if (!Number.isNaN(parsed)) publishedAt = new Date(parsed).toISOString();

    out.push({
      title,
      link,
      source: feedSource,
      publishedAt,
      thumbnail: "",
      summary: summaryRaw.slice(0, 280),
    });
  }

  return out;
}

export function parseFeedXml(xml: string, feedSource: string): NewsArticle[] {
  const t = xml.trim();
  if (t.includes("<rss")) return parseRssItems(t, feedSource);
  if (t.includes("<feed")) return parseAtomItems(t, feedSource);
  return [];
}

export type RssFeed = { url: string; source: string };

export async function fetchRssArticles(
  feeds: RssFeed[],
  timeoutMs = 10000
): Promise<NewsArticle[]> {
  const results = await Promise.all(
    feeds.map(async ({ url, source }) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          next: { revalidate: 300 },
          signal: ctrl.signal,
          headers: {
            Accept:
              "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            "User-Agent":
              "CapitalMarketsHub/1.0 (capital-markets dashboard; macro news aggregation)",
          },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseFeedXml(xml, source);
      } catch {
        return [];
      } finally {
        clearTimeout(t);
      }
    })
  );

  return results.flat();
}

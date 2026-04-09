import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RSS_URL = "https://www.visualcapitalist.com/feed/";
const CACHE_PATH = path.join(process.cwd(), "vc-daily-cache.json");

interface VCItem {
  title: string;
  link: string;
  imageUrl: string;
}

interface CachedData {
  items: VCItem[];
  fetchedDate: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCache(): CachedData | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")) as CachedData;
    if (data.fetchedDate === todayStr() && data.items?.length) return data;
    return null;
  } catch {
    return null;
  }
}

function saveCache(data: CachedData): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
}

function parseItems(xml: string): VCItem[] {
  const results: VCItem[] = [];
  const blocks = xml.split("<item>");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("</item>")[0];

    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = block.match(/<link>(https:\/\/www\.visualcapitalist\.com[^<]+)<\/link>/);

    if (!titleMatch?.[1] || !linkMatch?.[1]) continue;

    // Find the full infographic (_WEB image) from content:encoded — this is the tall, complete graphic
    const allImgs = [...block.matchAll(/src="(https:\/\/www\.visualcapitalist\.com\/wp-content\/uploads\/[^"]+\.(?:webp|jpg|jpeg|png))"/gi)];
    const fullImg = allImgs.find(m => /[-_]web/i.test(m[1]) && !/voronoi/i.test(m[1]));

    // Fall back to shareable thumbnail only if no full infographic found
    const fallbackImg =
      block.match(/<media:content\s+url="([^"]+)"/)?.[1] ||
      block.match(/<enclosure\s+url="([^"]+)"/)?.[1];

    const imageUrl = fullImg?.[1] || fallbackImg;
    if (!imageUrl) continue;

    results.push({
      title: titleMatch[1].trim(),
      link: linkMatch[1].trim(),
      imageUrl: imageUrl.trim(),
    });
  }
  return results;
}

export async function GET() {
  try {
    const cached = readCache();
    if (cached) {
      const idx = new Date().getDate() % cached.items.length;
      return NextResponse.json(cached.items[idx]);
    }

    const res = await fetch(RSS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/xml,application/rss+xml,application/xml",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `RSS returned ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();
    const items = parseItems(xml);

    if (!items.length) {
      return NextResponse.json({ error: "No items parsed from feed" }, { status: 502 });
    }

    try {
      saveCache({ items, fetchedDate: todayStr() });
    } catch {
      // Serverless / read-only FS (e.g. Vercel): RSS still works without a persisted cache
    }

    const idx = new Date().getDate() % items.length;
    return NextResponse.json(items[idx]);
  } catch (error) {
    console.error("VC daily error:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}

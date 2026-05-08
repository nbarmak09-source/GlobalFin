import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Hostnames where we enable the Next.js image optimizer (`next/image` without
 * `unoptimized`). Yahoo Finance and Zenfs are the usual sources for market
 * news thumbnails; RSS and other feeds may use arbitrary origins — those stay
 * unoptimized so we never need an open-ended remote allowlist.
 */
export const NEWS_THUMBNAIL_OPTIMIZE_HOSTNAMES = [
  "s.yimg.com",
  "media.zenfs.com",
  "o.aolcdn.com",
] as const;

export const newsThumbnailRemotePatterns: RemotePattern[] =
  NEWS_THUMBNAIL_OPTIMIZE_HOSTNAMES.map((hostname) => ({
    protocol: "https",
    hostname,
    pathname: "/**",
  }));

export function allowOptimizeNewsThumbnail(src: string): boolean {
  const s = src.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (NEWS_THUMBNAIL_OPTIMIZE_HOSTNAMES as readonly string[]).includes(host);
  } catch {
    return false;
  }
}

import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_BYTES = 25 * 1024 * 1024;

/** Allow only Visual Capitalist image URLs (origin + Jetpack CDN). Mitigates SSRF. */
function isAllowedVcImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (u.hostname === "www.visualcapitalist.com" && u.pathname.startsWith("/wp-content/uploads/")) {
      return true;
    }
    if (/^i[0-9]+\.wp\.com$/i.test(u.hostname)) {
      return u.pathname.includes("/www.visualcapitalist.com/wp-content/uploads/");
    }
    return false;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const urlParam = new URL(request.url).searchParams.get("url");
  if (!urlParam || urlParam.length > 4096) {
    return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
  }

  let imageUrl: string;
  try {
    imageUrl = decodeURIComponent(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url encoding" }, { status: 400 });
  }

  if (!isAllowedVcImageUrl(imageUrl)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  const upstream = await fetch(imageUrl, {
    headers: { "User-Agent": UA, Accept: "image/webp,image/apng,image/*,*/*;q=0.8" },
    redirect: "follow",
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
  }

  const len = upstream.headers.get("content-length");
  if (len && Number(len) > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  const ct = upstream.headers.get("content-type") || "application/octet-stream";
  if (!ct.startsWith("image/") && !ct.includes("octet-stream")) {
    return NextResponse.json({ error: "Not an image" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": ct.startsWith("image/") ? ct : "image/webp",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

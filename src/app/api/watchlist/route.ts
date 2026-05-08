import { NextRequest, NextResponse } from "next/server";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  reorderWatchlist,
} from "@/lib/portfolio";
import { getMultipleQuotes, getSectorsForSymbols } from "@/lib/yahoo";
import { getExtendedHoursLine } from "@/lib/extendedHours";
import { auth } from "@/lib/auth";
import type { EnrichedWatchlistItem } from "@/lib/types";

const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,10}$/;

function isValidSymbol(s: unknown): s is string {
  return typeof s === "string" && SYMBOL_REGEX.test(s.trim()) && s.trim().length > 0;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchlist = await getWatchlist(session.user.id);

    if (watchlist.length === 0) {
      return NextResponse.json([]);
    }

    const symbols = watchlist.map((w) => w.symbol);
    let quotes: Awaited<ReturnType<typeof getMultipleQuotes>> = [];
    let sectorMap = new Map<string, string>();
    try {
      [quotes, sectorMap] = await Promise.all([
        getMultipleQuotes(symbols),
        getSectorsForSymbols(symbols),
      ]);
    } catch (enrichErr) {
      console.error(
        "Watchlist GET enrichment (quotes/sectors) failed:",
        enrichErr instanceof Error ? enrichErr.message : enrichErr
      );
    }
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    const enriched: EnrichedWatchlistItem[] = watchlist.map((item) => {
      const quote = quoteMap.get(item.symbol);
      const sector = sectorMap.get(item.symbol.trim().toUpperCase()) ?? "";
      return {
        ...item,
        currentPrice: quote?.regularMarketPrice ?? 0,
        dayChange: quote?.regularMarketChange ?? 0,
        dayChangePercent: quote?.regularMarketChangePercent ?? 0,
        fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? 0,
        marketCap: quote?.marketCap ?? 0,
        volume: quote?.regularMarketVolume ?? 0,
        pe: quote?.trailingPE ?? 0,
        ytdReturn:
          quote?.ytdReturn != null && Number.isFinite(quote.ytdReturn) ? quote.ytdReturn : null,
        extendedHours: quote ? getExtendedHoursLine(quote) : null,
        sector,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error(
      "Watchlist GET error:",
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.stack : ""
    );
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { symbol, name } = body;

    if (!isValidSymbol(symbol)) {
      return NextResponse.json(
        { error: "symbol is required and must be 1–10 alphanumeric characters (letters, numbers, dots, hyphens)" },
        { status: 400 }
      );
    }

    const item = {
      symbol: String(symbol).trim().toUpperCase(),
      name: typeof name === "string" && name.trim() ? name.trim() : String(symbol).trim().toUpperCase(),
    };

    const created = await addToWatchlist(session.user.id, item);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds array is required" },
        { status: 400 }
      );
    }
    if (orderedIds.some((id: unknown) => typeof id !== "string" || id.trim().length === 0)) {
      return NextResponse.json(
        { error: "orderedIds must be an array of non-empty strings" },
        { status: 400 }
      );
    }

    await reorderWatchlist(session.user.id, orderedIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to reorder watchlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
    }

    const watchlist = await removeFromWatchlist(session.user.id, id.trim());
    return NextResponse.json(watchlist);
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  reorderWatchlist,
  ensureDefaultWatchlistGroup,
  assertWatchlistGroupOwnership,
} from "@/lib/portfolio";
import { getMultipleQuotes, getSectorsForSymbols, getQuoteSummary } from "@/lib/yahoo";
import { getExtendedHoursLine } from "@/lib/extendedHours";
import { auth } from "@/lib/auth";
import type { EnrichedWatchlistItem } from "@/lib/types";
import { fundamentalsFromQuoteSummary } from "@/lib/metrics";

const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,10}$/;

function isValidSymbol(s: unknown): s is string {
  return typeof s === "string" && SYMBOL_REGEX.test(s.trim()) && s.trim().length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDefaultWatchlistGroup(session.user.id);

    const { searchParams } = new URL(request.url);
    const qGroupId = searchParams.get("groupId")?.trim() || "";

    let groupFilter: string | undefined;
    if (qGroupId) {
      const owned = await assertWatchlistGroupOwnership(
        session.user.id,
        qGroupId
      );
      if (!owned) {
        return NextResponse.json(
          { error: "Invalid watchlist group" },
          { status: 403 }
        );
      }
      groupFilter = qGroupId;
    }

    const watchlist = await getWatchlist(session.user.id, groupFilter);

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

    const summaryBySymbol = new Map<string, Awaited<ReturnType<typeof getQuoteSummary>>>();
    try {
      const summaries = await Promise.all(
        symbols.map((sym) => getQuoteSummary(sym.trim().toUpperCase()))
      );
      for (let i = 0; i < symbols.length; i++) {
        summaryBySymbol.set(symbols[i].trim().toUpperCase(), summaries[i]);
      }
    } catch (sumErr) {
      console.error(
        "Watchlist GET fundamentals (quote summary) failed:",
        sumErr instanceof Error ? sumErr.message : sumErr
      );
    }

    const enriched: EnrichedWatchlistItem[] = watchlist.map((item) => {
      const quote = quoteMap.get(item.symbol);
      const symU = item.symbol.trim().toUpperCase();
      const summary = summaryBySymbol.get(symU) ?? null;
      const sector = sectorMap.get(item.symbol.trim().toUpperCase()) ?? "";
      return {
        ...item,
        currentPrice: quote?.regularMarketPrice ?? 0,
        dayChange: quote?.regularMarketChange ?? 0,
        dayChangePercent: quote?.regularMarketChangePercent ?? 0,
        fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? 0,
        regularMarketDayHigh: quote?.regularMarketDayHigh ?? 0,
        regularMarketDayLow: quote?.regularMarketDayLow ?? 0,
        exchange: quote?.exchange,
        exchangeName: quote?.exchangeName,
        marketCap: quote?.marketCap ?? 0,
        volume: quote?.regularMarketVolume ?? 0,
        pe: quote?.trailingPE ?? 0,
        ytdReturn:
          quote?.ytdReturn != null && Number.isFinite(quote.ytdReturn) ? quote.ytdReturn : null,
        extendedHours: quote ? getExtendedHoursLine(quote) : null,
        sector,
        fundamentals: fundamentalsFromQuoteSummary(summary),
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
    const { symbol, name, groupId } = body as Record<string, unknown>;

    await ensureDefaultWatchlistGroup(session.user.id);

    let targetGroupId: string | undefined;
    const rawGid =
      typeof groupId === "string" ? groupId.trim() : "";
    if (rawGid.length > 0) {
      const owned = await assertWatchlistGroupOwnership(
        session.user.id,
        rawGid
      );
      if (!owned) {
        return NextResponse.json(
          { error: "Invalid watchlist group" },
          { status: 403 }
        );
      }
      targetGroupId = rawGid;
    }

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

    const created = await addToWatchlist(session.user.id, item, targetGroupId);
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

    await ensureDefaultWatchlistGroup(session.user.id);

    const { searchParams } = new URL(request.url);
    const rawGroup = searchParams.get("groupId")?.trim() || "";

    let groupFilter: string | undefined;
    if (rawGroup) {
      const owned = await assertWatchlistGroupOwnership(
        session.user.id,
        rawGroup
      );
      if (!owned) {
        return NextResponse.json(
          { error: "Invalid watchlist group" },
          { status: 403 }
        );
      }
      groupFilter = rawGroup;
    }

    await reorderWatchlist(session.user.id, orderedIds, groupFilter);
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

    await ensureDefaultWatchlistGroup(session.user.id);

    const qGroupRaw = searchParams.get("groupId")?.trim() || "";
    let groupFilterReturn: string | undefined;
    if (qGroupRaw) {
      const owned = await assertWatchlistGroupOwnership(
        session.user.id,
        qGroupRaw
      );
      if (!owned) {
        return NextResponse.json(
          { error: "Invalid watchlist group" },
          { status: 403 }
        );
      }
      groupFilterReturn = qGroupRaw;
    }

    const watchlist = await removeFromWatchlist(
      session.user.id,
      id.trim(),
      groupFilterReturn
    );
    return NextResponse.json(watchlist);
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}

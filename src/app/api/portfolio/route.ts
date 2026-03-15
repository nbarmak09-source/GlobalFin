import { NextRequest, NextResponse } from "next/server";
import {
  getPositions,
  addPosition,
  updatePosition,
  deletePosition,
  reorderPositions,
} from "@/lib/portfolio";
import { getMultipleQuotes } from "@/lib/yahoo";
import { auth } from "@/lib/auth";
import type { EnrichedPosition } from "@/lib/types";

const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,10}$/;

function isValidSymbol(s: unknown): s is string {
  return typeof s === "string" && SYMBOL_REGEX.test(s.trim()) && s.trim().length > 0;
}

function isPositiveNumber(n: unknown): n is number {
  if (typeof n === "number" && !Number.isNaN(n) && n > 0 && isFinite(n)) return true;
  if (typeof n === "string") {
    const v = Number(n);
    return !Number.isNaN(v) && v > 0 && isFinite(v);
  }
  return false;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const positions = await getPositions(session.user.id);

    if (positions.length === 0) {
      return NextResponse.json([]);
    }

    const symbols = positions.map((p) => p.symbol);
    const quotes = await getMultipleQuotes(symbols);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    const enriched: EnrichedPosition[] = positions.map((pos) => {
      const quote = quoteMap.get(pos.symbol);
      const currentPrice = quote?.regularMarketPrice ?? pos.avgCost;
      const marketValue = currentPrice * pos.shares;
      const costBasis = pos.avgCost * pos.shares;
      const totalPL = marketValue - costBasis;
      const totalPLPercent = costBasis > 0 ? (totalPL / costBasis) * 100 : 0;
      const dayChange = quote?.regularMarketChange ?? 0;
      const dayChangePercent = quote?.regularMarketChangePercent ?? 0;

      return {
        ...pos,
        currentPrice,
        marketValue,
        dayChange,
        dayChangePercent,
        totalPL,
        totalPLPercent,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Portfolio GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
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
    const { symbol, name, shares, avgCost, purchaseDate } = body;

    if (!isValidSymbol(symbol)) {
      return NextResponse.json(
        { error: "symbol is required and must be 1–10 alphanumeric characters (letters, numbers, dots, hyphens)" },
        { status: 400 }
      );
    }

    if (!isPositiveNumber(shares)) {
      return NextResponse.json(
        { error: "shares is required and must be a positive number" },
        { status: 400 }
      );
    }

    if (!isPositiveNumber(avgCost)) {
      return NextResponse.json(
        { error: "avgCost is required and must be a positive number" },
        { status: 400 }
      );
    }

    const position = {
      symbol: String(symbol).trim().toUpperCase(),
      name: typeof name === "string" && name.trim() ? name.trim() : String(symbol).trim().toUpperCase(),
      shares: Number(shares),
      avgCost: Number(avgCost),
      ...(purchaseDate != null && String(purchaseDate).trim() && { purchaseDate: String(purchaseDate).trim().slice(0, 10) }),
    };

    const created = await addPosition(session.user.id, position);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Portfolio POST error:", error);
    return NextResponse.json(
      { error: "Failed to add position" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { id, ...updates } = body;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "id is required and must be a non-empty string" }, { status: 400 });
    }

    const positions = await updatePosition(session.user.id, id.trim(), updates);
    return NextResponse.json(positions);
  } catch (error) {
    console.error("Portfolio PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update position" },
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

    reorderPositions(session.user.id, orderedIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portfolio PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to reorder positions" },
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

    const positions = await deletePosition(session.user.id, id.trim());
    return NextResponse.json(positions);
  } catch (error) {
    console.error("Portfolio DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete position" },
      { status: 500 }
    );
  }
}

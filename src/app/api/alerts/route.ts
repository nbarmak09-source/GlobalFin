import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAlerts, createAlert, deleteAlert } from "@/lib/alerts";
import { getMultipleQuotes } from "@/lib/yahoo";

const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,10}$/;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await getAlerts(session.user.id);

    if (alerts.length === 0) return NextResponse.json([]);

    const symbols = [...new Set(alerts.map((a) => a.symbol))];
    const quotes = await getMultipleQuotes(symbols);
    const priceMap = new Map(
      quotes.map((q) => [q.symbol, q.regularMarketPrice])
    );

    const enriched = alerts.map((a) => {
      const currentPrice = priceMap.get(a.symbol) ?? null;
      const isTriggered =
        currentPrice !== null &&
        (a.direction === "above"
          ? currentPrice >= a.targetPrice
          : currentPrice <= a.targetPrice);

      return { ...a, currentPrice, triggered: a.triggered || isTriggered };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Alerts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
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
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { symbol, companyName, targetPrice, direction, note } = body;

    if (typeof symbol !== "string" || !SYMBOL_REGEX.test(symbol.trim())) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }

    if (typeof targetPrice !== "number" || targetPrice <= 0 || !isFinite(targetPrice)) {
      return NextResponse.json(
        { error: "targetPrice must be a positive number" },
        { status: 400 }
      );
    }

    if (direction !== "above" && direction !== "below") {
      return NextResponse.json(
        { error: "direction must be 'above' or 'below'" },
        { status: 400 }
      );
    }

    const alert = await createAlert(session.user.id, {
      symbol: symbol.trim().toUpperCase(),
      companyName:
        typeof companyName === "string" && companyName.trim()
          ? companyName.trim()
          : symbol.trim().toUpperCase(),
      targetPrice,
      direction,
      note: typeof note === "string" && note.trim() ? note.trim() : undefined,
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("Alerts POST error:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
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

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    await deleteAlert(session.user.id, id.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alerts DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}

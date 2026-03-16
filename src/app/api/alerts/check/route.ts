import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAlerts, markTriggered } from "@/lib/alerts";
import { getMultipleQuotes } from "@/lib/yahoo";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const alerts = await getAlerts(userId);
    if (alerts.length === 0) {
      return NextResponse.json({ updated: 0, total: 0 });
    }

    const symbols = [...new Set(alerts.map((a) => a.symbol))];
    const quotes = await getMultipleQuotes(symbols);
    const priceMap = new Map(
      quotes.map((q) => [q.symbol, q.regularMarketPrice as number | null]),
    );

    let updated = 0;

    await Promise.all(
      alerts.map(async (alert) => {
        const currentPrice = priceMap.get(alert.symbol);
        if (currentPrice == null) return;

        const shouldTrigger =
          alert.direction === "above"
            ? currentPrice >= alert.targetPrice
            : currentPrice <= alert.targetPrice;

        if (shouldTrigger && !alert.triggered) {
          await markTriggered(userId, alert.id);
          updated += 1;
        }
      }),
    );

    return NextResponse.json({ updated, total: alerts.length });
  } catch (error) {
    console.error("Alerts CHECK error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate alerts" },
      { status: 500 },
    );
  }
}


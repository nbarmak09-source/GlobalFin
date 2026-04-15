import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllPositionsForUser, getWatchlist } from "@/lib/portfolio";
import { getQuoteSummary } from "@/lib/yahoo";

export interface CalendarEvent {
  symbol: string;
  companyName: string;
  type: "earnings" | "dividend";
  date: string;
  detail: string;
  /** Before / after US market open when Yahoo provides an earnings call timestamp. */
  callTime?: "BMO" | "AMC";
}

/** US/Eastern hour classification for typical earnings releases. */
function classifyEarningsCallET(ms: number): "BMO" | "AMC" | undefined {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date(ms));
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const t = hour * 60 + minute;
  if (t < 9 * 60 + 30) return "BMO";
  if (t >= 16 * 60) return "AMC";
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "holdings";

    const symbols: { symbol: string; name: string }[] = [];

    if (scope === "holdings" || scope === "all") {
      const positions = await getAllPositionsForUser(session.user.id);
      const seen = new Set<string>();
      for (const p of positions) {
        if (!seen.has(p.symbol)) {
          seen.add(p.symbol);
          symbols.push({ symbol: p.symbol, name: p.name });
        }
      }
    }

    if (scope === "watchlist" || scope === "all") {
      const watchlist = await getWatchlist(session.user.id);
      watchlist.forEach((w) => {
        if (!symbols.some((s) => s.symbol === w.symbol)) {
          symbols.push({ symbol: w.symbol, name: w.name });
        }
      });
    }

    if (symbols.length === 0) {
      return NextResponse.json([]);
    }

    const events: CalendarEvent[] = [];

    const summaries = await Promise.allSettled(
      symbols.map((s) => getQuoteSummary(s.symbol))
    );

    summaries.forEach((result, i) => {
      if (result.status !== "fulfilled" || !result.value) return;
      const data = result.value;
      const sym = symbols[i];

      if (data.earningsDate) {
        const estEps = data.earningsTrend?.[0]?.earningsEstimate?.avg;
        events.push({
          symbol: sym.symbol,
          companyName: data.shortName || data.longName || sym.name,
          type: "earnings",
          date: data.earningsDate,
          detail: estEps != null ? `Est. EPS: $${estEps.toFixed(2)}` : "",
          callTime:
            data.earningsCallTimeMs != null
              ? classifyEarningsCallET(data.earningsCallTimeMs)
              : undefined,
        });
      }

      if (data.exDividendDate) {
        events.push({
          symbol: sym.symbol,
          companyName: data.shortName || data.longName || sym.name,
          type: "dividend",
          date: data.exDividendDate,
          detail: data.dividendRate
            ? `$${data.dividendRate.toFixed(2)}/share (${(data.dividendYield * 100).toFixed(2)}% yield)`
            : "",
        });
      }

      if (data.dividendPayDate && data.dividendPayDate !== data.exDividendDate) {
        events.push({
          symbol: sym.symbol,
          companyName: data.shortName || data.longName || sym.name,
          type: "dividend",
          date: data.dividendPayDate,
          detail: "Pay date",
        });
      }
    });

    events.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(events);
  } catch (error) {
    console.error("Calendar GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getQuoteSummaryHeavy } from "@/lib/yahoo";

const TRACKED_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "V", "UNH", "XOM", "JNJ", "WMT", "MA", "HD", "CVX", "MRK", "KO",
  "LLY", "AVGO",
];

export interface UpgradeEntry {
  symbol: string;
  date: string;
  firm: string;
  toGrade: string;
  fromGrade: string;
  action: string;
}

export async function GET() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);

    const summaries = await Promise.allSettled(
      TRACKED_SYMBOLS.map((sym) => getQuoteSummaryHeavy(sym))
    );

    const entries: UpgradeEntry[] = [];

    summaries.forEach((result, idx) => {
      if (result.status !== "fulfilled" || !result.value) return;
      const d = result.value;
      const symbol = TRACKED_SYMBOLS[idx];

      for (const item of d.upgradeDowngradeHistory ?? []) {
        if (!item.date) continue;
        const date = new Date(item.date);
        if (date < cutoff) continue;

        entries.push({
          symbol,
          date: item.date,
          firm: item.firm || "Unknown",
          toGrade: item.toGrade || "",
          fromGrade: item.fromGrade || "",
          action: item.action || "",
        });
      }
    });

    entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json(entries.slice(0, 50));
  } catch (error) {
    console.error("Upgrades API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch upgrades" },
      { status: 500 }
    );
  }
}

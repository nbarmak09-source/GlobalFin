import { NextResponse } from "next/server";
import { getTreasuryCurve } from "@/lib/treasury";

export const revalidate = 3600;

const YEARS_BY_MATURITY: Record<string, number> = {
  "1M": 1 / 12,
  "2M": 2 / 12,
  "3M": 0.25,
  "6M": 0.5,
  "1Y": 1,
  "2Y": 2,
  "3Y": 3,
  "5Y": 5,
  "7Y": 7,
  "10Y": 10,
  "20Y": 20,
  "30Y": 30,
};

export async function GET() {
  try {
    const { asOf, points } = await getTreasuryCurve();
    const first = points[0];
    return NextResponse.json({
      tenors: points.map((p) => ({
        label: p.maturity,
        years: YEARS_BY_MATURITY[p.maturity] ?? 0,
        yield: p.rate,
      })),
      asOf: asOf.toISOString(),
      source: first.source,
      sourceUrl: first.sourceUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Treasury curve unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

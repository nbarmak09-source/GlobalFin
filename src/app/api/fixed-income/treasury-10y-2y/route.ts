import { NextRequest, NextResponse } from "next/server";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

/** Daily observation caps by UI period (DGS10 / DGS2 are business-day series). */
const PERIOD_LIMITS: Record<string, number> = {
  "1Y": 400,
  "2Y": 800,
  "5Y": 2000,
  "10Y": 4000,
  "20Y": 8000,
  MAX: 15000,
};

async function fetchFredDaily(
  seriesId: string,
  apiKey: string,
  limit: number
): Promise<{ date: string; value: number }[]> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data: FredResponse = await res.json();
  return (data.observations || [])
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
    .filter((o) => !Number.isNaN(o.value))
    .reverse();
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "5Y";
  const limit = PERIOD_LIMITS[period] ?? PERIOD_LIMITS["5Y"];

  try {
    const [tenYear, twoYear] = await Promise.all([
      fetchFredDaily("DGS10", apiKey, limit),
      fetchFredDaily("DGS2", apiKey, limit),
    ]);

    return NextResponse.json({
      period,
      series: {
        tenYear: {
          id: "DGS10",
          label: "10-Year Treasury",
          unit: "percent",
          data: tenYear,
        },
        twoYear: {
          id: "DGS2",
          label: "2-Year Treasury",
          unit: "percent",
          data: twoYear,
        },
      },
      sourceUrl: "https://fred.stlouisfed.org/graph/?g=1&st=DGS10,DGS2",
    });
  } catch (e) {
    console.error("treasury-10y-2y:", e);
    return NextResponse.json(
      { error: "Failed to fetch Treasury yields" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

const SERIES: Record<string, { id: string; label: string; unit: string }> = {
  industrialProduction: {
    id: "INDPRO",
    label: "Industrial Production",
    unit: "index",
  },
  cpi: { id: "CPIAUCSL", label: "CPI (All Urban)", unit: "index" },
  cpiYoY: { id: "CPIAUCSL", label: "CPI YoY %", unit: "percent" },
  m2: { id: "M2SL", label: "M2 Money Supply", unit: "billions" },
  unemployment: { id: "UNRATE", label: "Unemployment Rate", unit: "percent" },
  fedFunds: {
    id: "FEDFUNDS",
    label: "Fed Funds Rate",
    unit: "percent",
  },
  recessionProb: {
    id: "RECPROUSM156N",
    label: "Recession Probability",
    unit: "percent",
  },
  ismManufacturing: {
    id: "BSCICP02USM460S",
    label: "Mfg. Confidence (PMI)",
    unit: "index",
  },
  consumerSentiment: {
    id: "UMCSENT",
    label: "Consumer Sentiment (UMich)",
    unit: "index",
  },
};

const PERIOD_LIMITS: Record<string, number> = {
  "1Y": 12,
  "2Y": 24,
  "5Y": 60,
  "10Y": 120,
  "20Y": 240,
  MAX: 600,
};

async function fetchFredHistory(
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
    .filter((o) => !isNaN(o.value))
    .reverse();
}

function computeYoY(
  data: { date: string; value: number }[]
): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  for (let i = 12; i < data.length; i++) {
    const prev = data[i - 12].value;
    if (prev !== 0) {
      result.push({
        date: data[i].date,
        value: ((data[i].value - prev) / prev) * 100,
      });
    }
  }
  return result;
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
  const limit = PERIOD_LIMITS[period] || 60;
  const extraForYoY = 12;

  try {
    const seriesKeys = Object.keys(SERIES).filter((k) => k !== "cpiYoY");

    const results = await Promise.all(
      seriesKeys.map(async (key) => {
        const meta = SERIES[key];
        const fetchLimit = key === "cpi" ? limit + extraForYoY : limit;
        const raw = await fetchFredHistory(meta.id, apiKey, fetchLimit);
        return { key, raw };
      })
    );

    const response: Record<
      string,
      {
        label: string;
        unit: string;
        data: { date: string; value: number }[];
      }
    > = {};

    for (const { key, raw } of results) {
      const meta = SERIES[key];
      response[key] = { label: meta.label, unit: meta.unit, data: raw.slice(-limit) };

      if (key === "cpi") {
        const yoy = computeYoY(raw);
        response.cpiYoY = {
          label: SERIES.cpiYoY.label,
          unit: SERIES.cpiYoY.unit,
          data: yoy.slice(-limit),
        };
      }
    }

    return NextResponse.json({ period, series: response });
  } catch (error) {
    console.error("Macro history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch macro history" },
      { status: 500 }
    );
  }
}

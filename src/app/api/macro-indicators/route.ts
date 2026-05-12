import { NextResponse } from "next/server";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

const SERIES = {
  industrialProd: "INDPRO",
  cpi: "CPIAUCSL",
  m2: "M2SL",
  recession: "USREC",
  recessionProb: "RECPROUSM156N",
  ismMfg: "BSCICP02USM460S",
  consumerSentiment: "UMCSENT",
};

function fredSeriesUrl(seriesId: string) {
  return `https://fred.stlouisfed.org/series/${seriesId}`;
}

async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
  limit = 13
): Promise<FredObservation[]> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data: FredResponse = await res.json();
  return (data.observations || []).filter((o) => o.value !== ".");
}

function parseNum(obs: FredObservation | undefined): number | null {
  if (!obs || obs.value === ".") return null;
  return parseFloat(obs.value);
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const [
      ipObs,
      cpiObs,
      m2Obs,
      recObs,
      recProbObs,
      ismMfgObs,
      sentimentObs,
    ] = await Promise.all([
      fetchFredSeries(SERIES.industrialProd, apiKey),
      fetchFredSeries(SERIES.cpi, apiKey),
      fetchFredSeries(SERIES.m2, apiKey),
      fetchFredSeries(SERIES.recession, apiKey, 2),
      fetchFredSeries(SERIES.recessionProb, apiKey, 2),
      fetchFredSeries(SERIES.ismMfg, apiKey, 3),
      fetchFredSeries(SERIES.consumerSentiment, apiKey, 3),
    ]);

    const ipLatest = parseNum(ipObs[0]);
    const ipPrev = parseNum(ipObs[1]);
    const ip12MAgo = parseNum(ipObs[12] ?? ipObs[ipObs.length - 1]);
    const ipYoY =
      ipLatest != null && ip12MAgo != null && ip12MAgo !== 0
        ? ((ipLatest - ip12MAgo) / ip12MAgo) * 100
        : null;

    const cpiLatest = parseNum(cpiObs[0]);
    const cpi12MAgo = parseNum(cpiObs[12] ?? cpiObs[cpiObs.length - 1]);
    const cpiYoY =
      cpiLatest != null && cpi12MAgo != null && cpi12MAgo !== 0
        ? ((cpiLatest - cpi12MAgo) / cpi12MAgo) * 100
        : null;

    const m2Latest = parseNum(m2Obs[0]);
    const m212MAgo = parseNum(m2Obs[12] ?? m2Obs[m2Obs.length - 1]);
    const m2YoY =
      m2Latest != null && m212MAgo != null && m212MAgo !== 0
        ? ((m2Latest - m212MAgo) / m212MAgo) * 100
        : null;

    const recLatest = parseNum(recObs[0]);
    const recProbLatest = parseNum(recProbObs[0]);

    const ismMfgLatest = parseNum(ismMfgObs[0]);
    const ismMfgPrev = parseNum(ismMfgObs[1]);

    const sentimentLatest = parseNum(sentimentObs[0]);
    const sentimentPrev = parseNum(sentimentObs[1]);

    return NextResponse.json({
      asOf: ipObs[0]?.date || cpiObs[0]?.date || new Date().toISOString(),
      industrialProduction: {
        value: ipLatest,
        previous: ipPrev,
        change: ipLatest != null && ipPrev != null ? ipLatest - ipPrev : null,
        yoyChange: ipYoY != null ? Math.round(ipYoY * 100) / 100 : null,
        date: ipObs[0]?.date,
        sourceUrl: fredSeriesUrl(SERIES.industrialProd),
      },
      cpi: {
        value: cpiLatest,
        yoyChange: cpiYoY != null ? Math.round(cpiYoY * 100) / 100 : null,
        date: cpiObs[0]?.date,
        sourceUrl: fredSeriesUrl(SERIES.cpi),
      },
      m2: {
        value: m2Latest,
        yoyChange: m2YoY != null ? Math.round(m2YoY * 100) / 100 : null,
        date: m2Obs[0]?.date,
        sourceUrl: fredSeriesUrl(SERIES.m2),
      },
      businessCycle: {
        inRecession: recLatest === 1,
        recessionProbability: recProbLatest,
        date: recObs[0]?.date || recProbObs[0]?.date,
        sourceUrl: fredSeriesUrl(SERIES.recession),
      },
      ismManufacturing: {
        value: ismMfgLatest,
        previous: ismMfgPrev,
        change:
          ismMfgLatest != null && ismMfgPrev != null
            ? Math.round((ismMfgLatest - ismMfgPrev) * 100) / 100
            : null,
        date: ismMfgObs[0]?.date,
        sourceUrl: fredSeriesUrl(SERIES.ismMfg),
      },
      consumerSentiment: {
        value: sentimentLatest,
        previous: sentimentPrev,
        change:
          sentimentLatest != null && sentimentPrev != null
            ? Math.round((sentimentLatest - sentimentPrev) * 100) / 100
            : null,
        date: sentimentObs[0]?.date,
        sourceUrl: fredSeriesUrl(SERIES.consumerSentiment),
      },
    }, { headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("Macro indicators error:", error);
    return NextResponse.json(
      { error: "Failed to fetch macro indicators" },
      { status: 500 }
    );
  }
}

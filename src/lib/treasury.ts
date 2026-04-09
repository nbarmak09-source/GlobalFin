const TREASURY_XML_BASE =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml";

export const TREASURY_SOURCE_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates";

export type TreasuryCurvePoint = {
  maturity: string;
  rate: number;
  source: "US Treasury";
  sourceUrl: string;
};

/** XML element names in the Daily Treasury Par Yield Curve feed (m:properties). */
const MATURITY_XML_TAGS: Array<{ maturity: string; tag: string }> = [
  { maturity: "1M", tag: "BC_1MONTH" },
  { maturity: "2M", tag: "BC_2MONTH" },
  { maturity: "3M", tag: "BC_3MONTH" },
  { maturity: "6M", tag: "BC_6MONTH" },
  { maturity: "1Y", tag: "BC_1YEAR" },
  { maturity: "2Y", tag: "BC_2YEAR" },
  { maturity: "3Y", tag: "BC_3YEAR" },
  { maturity: "5Y", tag: "BC_5YEAR" },
  { maturity: "7Y", tag: "BC_7YEAR" },
  { maturity: "10Y", tag: "BC_10YEAR" },
  { maturity: "20Y", tag: "BC_20YEAR" },
  { maturity: "30Y", tag: "BC_30YEAR" },
];

function yyyymm(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function addMonths(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + delta);
  return next;
}

function parseRateFromEntry(entryXml: string, tag: string): number | null {
  const re = new RegExp(
    `<d:${tag}[^>]*>([^<]+)</d:${tag}>`,
    "i"
  );
  const m = entryXml.match(re);
  if (!m) return null;
  const raw = m[1].trim();
  if (raw === "N/A" || raw === "") return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function parseDateFromEntry(entryXml: string): Date | null {
  const m = entryXml.match(/<d:NEW_DATE[^>]*>([^<]+)<\/d:NEW_DATE>/i);
  if (!m) return null;
  const d = new Date(m[1].trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLastEntry(xml: string): { entryXml: string; date: Date } | null {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
  if (entries.length === 0) return null;
  const last = entries[entries.length - 1][1];
  const date = parseDateFromEntry(last);
  if (!date) return null;
  return { entryXml: last, date };
}

async function fetchTreasuryYieldXml(yyyymm: string): Promise<string> {
  const url = new URL(TREASURY_XML_BASE);
  url.searchParams.set("data", "daily_treasury_yield_curve");
  // Treasury docs: field_tdr_date_value is calendar year (yyyy) or "all";
  // field_tdr_date_value_month is yyyymm for a specific month. Using YYYYMM
  // with field_tdr_date_value returns no rows; month filter is required for month scope.
  url.searchParams.set("field_tdr_date_value_month", yyyymm);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/xml, text/xml, */*" },
  });
  if (!res.ok) {
    throw new Error(`Treasury XML HTTP ${res.status}`);
  }
  return res.text();
}

/**
 * Fetches the Daily Treasury Par Yield Curve (XML), takes the most recent day
 * in the feed, and returns selected constant-maturity par yields (%).
 */
export async function getTreasuryCurve(): Promise<{
  asOf: Date;
  points: TreasuryCurvePoint[];
}> {
  const now = new Date();
  const attempts: string[] = [yyyymm(now), yyyymm(addMonths(now, -1))];

  let xml: string | null = null;
  for (const period of attempts) {
    const text = await fetchTreasuryYieldXml(period);
    const parsed = parseLastEntry(text);
    if (parsed) {
      xml = text;
      break;
    }
  }

  if (!xml) {
    throw new Error("Treasury yield curve XML contained no entries");
  }

  const last = parseLastEntry(xml);
  if (!last) {
    throw new Error("Treasury yield curve XML parse failed");
  }

  const points: TreasuryCurvePoint[] = [];
  for (const { maturity, tag } of MATURITY_XML_TAGS) {
    const rate = parseRateFromEntry(last.entryXml, tag);
    if (rate === null) continue;
    points.push({
      maturity,
      rate,
      source: "US Treasury",
      sourceUrl: TREASURY_SOURCE_URL,
    });
  }

  if (points.length === 0) {
    throw new Error("Treasury yield curve had no usable rates");
  }

  return { asOf: last.date, points };
}

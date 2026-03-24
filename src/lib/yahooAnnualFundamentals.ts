import YahooFinance from "yahoo-finance2";
import type { SECAnnualFinancialRow, SECFinancials } from "./types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function num(r: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function rowUnixSeconds(r: Record<string, unknown>): number {
  const d = r.date;
  if (d instanceof Date) return Math.floor(d.getTime() / 1000);
  if (typeof d === "number" && Number.isFinite(d)) return d;
  if (typeof d === "string") {
    const t = new Date(d).getTime();
    return Number.isFinite(t) ? Math.floor(t / 1000) : NaN;
  }
  return NaN;
}

/** Annual fundamentals via Yahoo timeseries (works when SEC EDGAR is blocked). */
export async function getAnnualFinancialsFromYahoo(
  symbol: string,
): Promise<SECFinancials | null> {
  try {
    const rows = (await yf.fundamentalsTimeSeries(symbol, {
      period1: new Date("2014-01-01"),
      period2: new Date(),
      type: "annual",
      module: "all",
    })) as Record<string, unknown>[];

    if (!rows?.length) return null;

    const sorted = [...rows].sort(
      (a, b) => rowUnixSeconds(a) - rowUnixSeconds(b),
    );

    const annualData: SECAnnualFinancialRow[] = sorted.flatMap((r) => {
      const ts = rowUnixSeconds(r);
      if (!Number.isFinite(ts)) return [];
      const end = new Date(ts * 1000);
      const fiscalYear = end.getUTCFullYear().toString();

      const revenue = num(r, "totalRevenue", "operatingRevenue");
      const ebitda = num(r, "ebitda", "normalizedEBITDA");
      const depreciation = num(
        r,
        "reconciledDepreciation",
        "depreciationAndAmortizationInIncomeStatement",
        "depreciationAmortizationDepletionIncomeStatement",
        "depreciationIncomeStatement",
      );
      const capexRaw = num(r, "capitalExpenditure", "capitalExpenditureReported");
      const operatingCashflow = num(
        r,
        "operatingCashFlow",
        "cashFlowFromContinuingOperatingActivities",
      );

      const ca = num(r, "currentAssets");
      const cl = num(r, "currentLiabilities");
      const wcDirect = num(r, "workingCapital");
      const workingCapital =
        wcDirect != null
          ? wcDirect
          : ca != null && cl != null
            ? ca - cl
            : null;

      return [
        {
          fiscalYear,
          revenue,
          ebitda,
          capex: capexRaw,
          depreciation,
          currentAssets: ca,
          currentLiabilities: cl,
          workingCapital,
          operatingCashflow,
        },
      ];
    });

    const dedup = new Map<string, SECAnnualFinancialRow>();
    for (const row of annualData) {
      dedup.set(row.fiscalYear, row);
    }
    const merged = [...dedup.values()].sort(
      (a, b) => Number(b.fiscalYear) - Number(a.fiscalYear),
    );

    return {
      symbol: symbol.toUpperCase(),
      cik: "",
      annualData: merged.slice(0, 8),
      dataSource: "yahoo",
    };
  } catch (e) {
    console.error("Yahoo annual fundamentals error:", e);
    return null;
  }
}

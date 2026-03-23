import type { SECFinancials } from "./types";

/** Values from the most recent SEC annual row used to seed model % inputs. */
export type LatestFiscalBase = {
  fiscalYear: string;
  revenue: number | null;
  capexAbs: number | null;
  capexPctOfRev: number | null;
  da: number | null;
  daPctOfRev: number | null;
  changeInWC: number | null;
  changeWcPctOfRev: number | null;
  /** YoY revenue growth, latest vs prior fiscal year (SEC). */
  revenueGrowthYoY: number | null;
};

export function getLatestFiscalBase(
  secData: SECFinancials | null,
): LatestFiscalBase | null {
  if (!secData?.annualData?.length) return null;
  const sorted = [...secData.annualData].sort(
    (a, b) => Number(b.fiscalYear) - Number(a.fiscalYear),
  );
  const latest = sorted[0];
  const prev = sorted[1];

  const revenue = latest.revenue;
  const capexRaw = latest.capex;
  const capexAbs = capexRaw != null ? Math.abs(capexRaw) : null;
  const capexPctOfRev =
    revenue && revenue > 0 && capexAbs != null
      ? Math.round((capexAbs / revenue) * 1000) / 10
      : null;

  const da = latest.depreciation;
  const daPctOfRev =
    revenue && revenue > 0 && da != null
      ? Math.round((da / revenue) * 1000) / 10
      : null;

  let changeInWC: number | null = null;
  let changeWcPctOfRev: number | null = null;
  if (
    prev &&
    latest.workingCapital != null &&
    prev.workingCapital != null &&
    revenue &&
    revenue > 0
  ) {
    changeInWC = latest.workingCapital - prev.workingCapital;
    changeWcPctOfRev =
      Math.round((Math.abs(changeInWC) / revenue) * 1000) / 10;
  }

  let revenueGrowthYoY: number | null = null;
  if (
    prev?.revenue != null &&
    prev.revenue > 0 &&
    latest.revenue != null
  ) {
    revenueGrowthYoY =
      Math.round(
        ((latest.revenue - prev.revenue) / prev.revenue) * 1000,
      ) / 10;
  }

  return {
    fiscalYear: latest.fiscalYear,
    revenue,
    capexAbs,
    capexPctOfRev,
    da,
    daPctOfRev,
    changeInWC,
    changeWcPctOfRev,
    revenueGrowthYoY,
  };
}

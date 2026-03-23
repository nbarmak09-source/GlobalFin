"use client";

import { useMemo } from "react";
import type { QuoteSummaryData, SECFinancials } from "@/lib/types";
import { getLatestFiscalBase } from "@/lib/latestFiscalBase";

function fmtM(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

function dollarWithPctRev(
  amount: number | null,
  pctOfRev: number | null,
  revenue: number | null,
): string {
  if (amount == null) return "—";
  const base = fmtM(amount);
  const pct =
    pctOfRev ??
    (revenue && revenue > 0
      ? Math.round((Math.abs(amount) / revenue) * 1000) / 10
      : null);
  if (pct == null) return base;
  return `${base} (${pct.toFixed(1)}% of revenue)`;
}

type Props = {
  secData: SECFinancials | null;
  data: QuoteSummaryData;
  /** DCF-only: static defaults shown for transparency */
  showWaccAndTax?: boolean;
  defaultWacc?: number;
  defaultTaxRate?: number;
};

export default function LatestFiscalBaseSummary({
  secData,
  data,
  showWaccAndTax = false,
  defaultWacc = 10,
  defaultTaxRate = 21,
}: Props) {
  const base = useMemo(() => getLatestFiscalBase(secData), [secData]);

  const y1Growth =
    Math.round(((data.revenueGrowth ?? 0.05) * 100) * 10) / 10;
  const ebitdaMargin =
    Math.round(((data.ebitdaMargins ?? 0.2) * 100) * 10) / 10;

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
        Base assumptions (most recent fiscal year)
      </h4>

      {base ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt className="text-muted">Fiscal year (SEC)</dt>
            <dd className="tabular-nums font-medium text-right">
              FY {base.fiscalYear}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Revenue</dt>
            <dd className="tabular-nums text-right">
              {base.revenue != null ? fmtM(base.revenue) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Revenue growth (YoY, SEC)</dt>
            <dd className="tabular-nums text-right">
              {base.revenueGrowthYoY != null
                ? `${base.revenueGrowthYoY >= 0 ? "+" : ""}${base.revenueGrowthYoY.toFixed(1)}%`
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt className="text-muted">CapEx</dt>
            <dd className="tabular-nums text-right">
              {dollarWithPctRev(
                base.capexAbs,
                base.capexPctOfRev,
                base.revenue,
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt className="text-muted">D&A</dt>
            <dd className="tabular-nums text-right">
              {dollarWithPctRev(base.da, base.daPctOfRev, base.revenue)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt className="text-muted">Change in working capital</dt>
            <dd className="tabular-nums text-right">
              {base.changeInWC != null
                ? dollarWithPctRev(
                    base.changeInWC,
                    base.changeWcPctOfRev,
                    base.revenue,
                  )
                : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted">
          No SEC annual filing data for this symbol. CapEx, D&amp;A, and
          working-capital change defaults use generic placeholders until SEC
          data loads.
        </p>
      )}

      <div className="pt-2 border-t border-border space-y-1.5 text-sm">
        <p className="text-xs font-medium text-muted uppercase tracking-wider">
          Forecast defaults (Yahoo / model)
        </p>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Revenue growth Y1 (trailing)</span>
          <span className="tabular-nums">{y1Growth.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">EBITDA margin (trailing)</span>
          <span className="tabular-nums">{ebitdaMargin.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Projection base revenue (LTM)</span>
          <span className="tabular-nums">
            {data.totalRevenue != null && data.totalRevenue > 0
              ? fmtM(data.totalRevenue)
              : "—"}
          </span>
        </div>
        {showWaccAndTax && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-muted">WACC</span>
              <span className="tabular-nums">{defaultWacc.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted">Tax rate</span>
              <span className="tabular-nums">{defaultTaxRate.toFixed(0)}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

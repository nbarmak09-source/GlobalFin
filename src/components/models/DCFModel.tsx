"use client";

import { useState, useMemo, type ReactNode } from "react";
import type {
  QuoteSummaryData,
  SECAnnualFinancialRow,
  SECFinancials,
} from "@/lib/types";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";

interface DCFModelProps {
  data: QuoteSummaryData;
  secData: SECFinancials | null;
  symbol: string;
}

const NUM_YEARS = 5;

function fmtB(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtM(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function cellPctOfRev(
  value: number | null,
  revenue: number | null,
  useAbsForDisplay: boolean,
): ReactNode {
  if (value == null) return "—";
  const displayed = useAbsForDisplay ? Math.abs(value) : value;
  const pct =
    revenue != null && revenue > 0
      ? (Math.abs(value) / revenue) * 100
      : null;
  return (
    <>
      {fmtM(displayed)}
      {pct != null && (
        <span className="text-muted text-xs">
          {" "}
          ({pct.toFixed(1)}% of revenue)
        </span>
      )}
    </>
  );
}

function cellDeltaWC(
  row: SECAnnualFinancialRow,
  prev: SECAnnualFinancialRow | undefined,
): ReactNode {
  if (
    !prev ||
    prev.workingCapital == null ||
    row.workingCapital == null
  ) {
    return "—";
  }
  const delta = row.workingCapital - prev.workingCapital;
  return cellPctOfRev(delta, row.revenue, false);
}

type FiscalBaseBridge = {
  fiscalYear: string;
  revenue: number;
  ebitda: number | null;
  da: number | null;
  ebit: number | null;
  taxes: number | null;
  nopat: number | null;
  capex: number | null;
  dwc: number | null;
  ufcf: number | null;
};

function pickCompletedFiscalRow(
  annualData: SECAnnualFinancialRow[] | undefined,
): { row: SECAnnualFinancialRow | null; prev: SECAnnualFinancialRow | null } {
  if (!annualData?.length) return { row: null, prev: null };
  const asc = [...annualData].sort(
    (a, b) => Number(a.fiscalYear) - Number(b.fiscalYear),
  );
  const cy = new Date().getFullYear();
  const withRevenue = asc.filter((r) => r.revenue != null && r.revenue > 0);
  const completed = withRevenue.filter((r) => Number(r.fiscalYear) < cy);
  const pool = completed.length > 0 ? completed : withRevenue;
  const row = pool[pool.length - 1];
  if (!row) return { row: null, prev: null };
  const idx = asc.findIndex((r) => r.fiscalYear === row.fiscalYear);
  const prev = idx > 0 ? asc[idx - 1] : null;
  return { row, prev };
}

function buildFiscalBaseBridge(
  row: SECAnnualFinancialRow,
  prev: SECAnnualFinancialRow | null,
  quoteEbitdaMarginDec: number,
  taxRatePct: number,
): FiscalBaseBridge | null {
  const revenue = row.revenue;
  if (revenue == null || revenue <= 0) return null;

  const ebitda =
    row.ebitda != null
      ? row.ebitda
      : quoteEbitdaMarginDec > 0
        ? revenue * quoteEbitdaMarginDec
        : null;
  const da = row.depreciation ?? null;
  const ebit =
    ebitda != null && da != null ? ebitda - da : null;
  const taxes =
    ebit != null ? Math.max(ebit * (taxRatePct / 100), 0) : null;
  const nopat =
    ebit != null && taxes != null ? ebit - taxes : null;
  const capex =
    row.capex != null ? Math.abs(row.capex) : null;
  const dwc =
    prev?.workingCapital != null && row.workingCapital != null
      ? row.workingCapital - prev.workingCapital
      : null;
  const ufcf =
    nopat != null && da != null && capex != null && dwc != null
      ? nopat + da - capex - dwc
      : null;

  return {
    fiscalYear: row.fiscalYear,
    revenue,
    ebitda,
    da,
    ebit,
    taxes,
    nopat,
    capex,
    dwc,
    ufcf,
  };
}

function renderFiscalBaseCell(
  label: string,
  fb: FiscalBaseBridge | null,
): ReactNode {
  if (!fb) return "—";
  const rev = fb.revenue;
  switch (label) {
    case "Revenue":
      return fmtM(fb.revenue);
    case "EBITDA":
      return fb.ebitda != null ? fmtM(fb.ebitda) : "—";
    case "(-) D&A":
    case "(+) D&A":
      return fb.da != null
        ? cellPctOfRev(fb.da, rev, false)
        : "—";
    case "EBIT":
      return fb.ebit != null ? fmtM(fb.ebit) : "—";
    case "(-) Taxes":
      return fb.taxes != null ? fmtM(fb.taxes) : "—";
    case "NOPAT":
      return fb.nopat != null ? fmtM(fb.nopat) : "—";
    case "(-) CapEx":
      return fb.capex != null
        ? cellPctOfRev(fb.capex, rev, false)
        : "—";
    case "(-) ΔWC":
      return fb.dwc != null
        ? cellPctOfRev(fb.dwc, rev, false)
        : "—";
    case "Unlevered FCF":
      return fb.ufcf != null ? fmtM(fb.ufcf) : "—";
    default:
      return "—";
  }
}

function deriveDefaults(data: QuoteSummaryData, secData: SECFinancials | null) {
  const revGrowthPct = (data.revenueGrowth || 0.05) * 100;
  const ebitdaMarginPct = (data.ebitdaMargins || 0.2) * 100;

  let capexPct = 5;
  let daPct = 3;
  let wcPct = 1;

  if (secData?.annualData && secData.annualData.length > 0) {
    const sorted = [...secData.annualData].sort(
      (a, b) => Number(b.fiscalYear) - Number(a.fiscalYear),
    );
    const latest = sorted[0];
    if (latest.revenue && latest.capex != null) {
      capexPct =
        Math.round((Math.abs(latest.capex) / latest.revenue) * 1000) / 10;
    }
    if (latest.revenue && latest.depreciation != null) {
      daPct =
        Math.round((latest.depreciation / latest.revenue) * 1000) / 10;
    }
    if (sorted.length >= 2) {
      const prev = sorted[1];
      if (
        latest.workingCapital != null &&
        prev.workingCapital != null &&
        latest.revenue
      ) {
        wcPct =
          Math.round(
            (Math.abs(latest.workingCapital - prev.workingCapital) /
              latest.revenue) *
              1000,
          ) / 10;
      }
    }
  }

  const growthRates = Array.from({ length: NUM_YEARS }, (_, i) => {
    const taper = 1 - i * 0.15;
    return Math.round(revGrowthPct * Math.max(taper, 0.3) * 10) / 10;
  });

  return {
    growthRates,
    ebitdaMargins: Array(NUM_YEARS).fill(
      Math.round(ebitdaMarginPct * 10) / 10,
    ) as number[],
    capexPct,
    daPct,
    taxRate: 21,
    wcPct,
    wacc: 10,
    terminalMethod: "perpetuity" as const,
    terminalGrowthRate: 2.5,
    exitMultiple:
      data.enterpriseToEbitda > 0
        ? Math.round(data.enterpriseToEbitda * 10) / 10
        : 10,
  };
}

export default function DCFModel({ data, secData, symbol }: DCFModelProps) {
  const defaults = useMemo(
    () => deriveDefaults(data, secData),
    [data, secData],
  );

  const [growthRates, setGrowthRates] = useState(defaults.growthRates);
  const [ebitdaMargins, setEbitdaMargins] = useState(defaults.ebitdaMargins);
  const [capexPct, setCapexPct] = useState(defaults.capexPct);
  const [daPct, setDaPct] = useState(defaults.daPct);
  const [taxRate, setTaxRate] = useState(defaults.taxRate);
  const [wcPct, setWcPct] = useState(defaults.wcPct);
  const [wacc, setWacc] = useState(defaults.wacc);
  const [terminalMethod, setTerminalMethod] = useState<
    "perpetuity" | "exitMultiple"
  >(defaults.terminalMethod);
  const [terminalGrowthRate, setTerminalGrowthRate] = useState(
    defaults.terminalGrowthRate,
  );
  const [exitMultiple, setExitMultiple] = useState(defaults.exitMultiple);

  const projections = useMemo(() => {
    const baseRevenue = data.totalRevenue || 0;
    const sharesOut = data.sharesOutstanding || 1;
    const netDebt = (data.totalDebt || 0) - (data.totalCash || 0);
    const currentPrice = data.regularMarketPrice || 0;
    const waccDec = wacc / 100;

    const years: {
      year: number;
      revenue: number;
      ebitda: number;
      da: number;
      ebit: number;
      taxes: number;
      nopat: number;
      capex: number;
      dwc: number;
      ufcf: number;
      df: number;
      pvFCF: number;
    }[] = [];

    let prevRevenue = baseRevenue;

    for (let i = 0; i < NUM_YEARS; i++) {
      const revenue = prevRevenue * (1 + growthRates[i] / 100);
      const ebitda = revenue * (ebitdaMargins[i] / 100);
      const da = revenue * (daPct / 100);
      const ebit = ebitda - da;
      const taxes = Math.max(ebit * (taxRate / 100), 0);
      const nopat = ebit - taxes;
      const capex = revenue * (capexPct / 100);
      const dwc = (revenue - prevRevenue) * (wcPct / 100);
      const ufcf = nopat + da - capex - dwc;
      const df = 1 / Math.pow(1 + waccDec, i + 1);

      years.push({
        year: new Date().getFullYear() + i + 1,
        revenue,
        ebitda,
        da,
        ebit,
        taxes,
        nopat,
        capex,
        dwc,
        ufcf,
        df,
        pvFCF: ufcf * df,
      });

      prevRevenue = revenue;
    }

    const lastYear = years[years.length - 1];
    const lastDF = lastYear.df;

    let terminalValue: number;
    if (terminalMethod === "perpetuity") {
      const tg = terminalGrowthRate / 100;
      terminalValue =
        waccDec > tg ? (lastYear.ufcf * (1 + tg)) / (waccDec - tg) : 0;
    } else {
      terminalValue = lastYear.ebitda * exitMultiple;
    }

    const pvTerminal = terminalValue * lastDF;
    const pvFCFs = years.reduce((s, y) => s + y.pvFCF, 0);
    const enterpriseValue = pvFCFs + pvTerminal;
    const equityValue = enterpriseValue - netDebt;
    const impliedPrice = equityValue / sharesOut;
    const upside = currentPrice
      ? ((impliedPrice - currentPrice) / currentPrice) * 100
      : 0;

    return {
      years,
      terminalValue,
      pvTerminal,
      pvFCFs,
      enterpriseValue,
      netDebt,
      equityValue,
      impliedPrice,
      currentPrice,
      upside,
      sharesOut,
      baseRevenue,
    };
  }, [
    growthRates,
    ebitdaMargins,
    capexPct,
    daPct,
    taxRate,
    wcPct,
    wacc,
    terminalMethod,
    terminalGrowthRate,
    exitMultiple,
    data,
  ]);

  const sensitivity = useMemo(() => {
    const waccVals = [-2, -1, 0, 1, 2].map((d) => wacc + d);
    const isPerpetuity = terminalMethod === "perpetuity";
    const secondaryVals = isPerpetuity
      ? [-1, -0.5, 0, 0.5, 1].map((d) => terminalGrowthRate + d)
      : [-3, -1.5, 0, 1.5, 3].map((d) => exitMultiple + d);

    const matrix = waccVals.map((w) =>
      secondaryVals.map((s) => {
        const wDec = w / 100;
        let prevRev = projections.baseRevenue;
        let lastUFCF = 0;
        let lastEBITDA = 0;
        let pvFCFs = 0;

        for (let i = 0; i < NUM_YEARS; i++) {
          const rev = prevRev * (1 + growthRates[i] / 100);
          const ebitda = rev * (ebitdaMargins[i] / 100);
          const da = rev * (daPct / 100);
          const ebit = ebitda - da;
          const taxes = Math.max(ebit * (taxRate / 100), 0);
          const nopat = ebit - taxes;
          const capex = rev * (capexPct / 100);
          const dwc = (rev - prevRev) * (wcPct / 100);
          const ufcf = nopat + da - capex - dwc;
          pvFCFs += ufcf / Math.pow(1 + wDec, i + 1);
          lastUFCF = ufcf;
          lastEBITDA = ebitda;
          prevRev = rev;
        }

        const lastDF = 1 / Math.pow(1 + wDec, NUM_YEARS);
        let tv: number;
        if (isPerpetuity) {
          const tg = s / 100;
          if (wDec <= tg) return NaN;
          tv = (lastUFCF * (1 + tg)) / (wDec - tg);
        } else {
          tv = lastEBITDA * s;
        }

        const ev = pvFCFs + tv * lastDF;
        return (ev - projections.netDebt) / projections.sharesOut;
      }),
    );

    return { waccVals, secondaryVals, isPerpetuity, matrix };
  }, [
    wacc,
    terminalGrowthRate,
    exitMultiple,
    terminalMethod,
    projections,
    growthRates,
    ebitdaMargins,
    capexPct,
    daPct,
    taxRate,
    wcPct,
  ]);

  const fiscalPick = useMemo(
    () => pickCompletedFiscalRow(secData?.annualData),
    [secData?.annualData],
  );

  const fiscalBridge = useMemo(() => {
    if (!fiscalPick.row) return null;
    return buildFiscalBaseBridge(
      fiscalPick.row,
      fiscalPick.prev,
      data.ebitdaMargins ?? 0.2,
      taxRate,
    );
  }, [
    fiscalPick.row,
    fiscalPick.prev,
    data.ebitdaMargins,
    taxRate,
  ]);

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    const assumptionsRows = [
      ["DCF Model — " + symbol],
      [],
      ["Key Assumptions"],
      ["Tax Rate", taxRate + "%"],
      ["WACC", wacc + "%"],
      ["CapEx % of Revenue", capexPct + "%"],
      ["D&A % of Revenue", daPct + "%"],
      ["WC Change % of Revenue", wcPct + "%"],
      [
        "Terminal Method",
        terminalMethod === "perpetuity" ? "Perpetuity Growth" : "Exit Multiple",
      ],
      ...(terminalMethod === "perpetuity"
        ? [["Terminal Growth Rate", terminalGrowthRate + "%"]]
        : [["Exit Multiple", exitMultiple + "x"]]),
      [],
      ["Year", ...projections.years.map((y) => y.year)],
      ["Revenue Growth", ...growthRates.map((r) => r + "%")],
      ["EBITDA Margin", ...ebitdaMargins.map((m) => m + "%")],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(assumptionsRows),
      "Assumptions",
    );

    const projRows = [
      ["Projections — " + symbol],
      [],
      ["($ millions)", ...projections.years.map((y) => y.year)],
      [
        "Revenue",
        ...projections.years.map((y) => +(y.revenue / 1e6).toFixed(1)),
      ],
      [
        "EBITDA",
        ...projections.years.map((y) => +(y.ebitda / 1e6).toFixed(1)),
      ],
      ["D&A", ...projections.years.map((y) => +(y.da / 1e6).toFixed(1))],
      ["EBIT", ...projections.years.map((y) => +(y.ebit / 1e6).toFixed(1))],
      [
        "Taxes",
        ...projections.years.map((y) => +(y.taxes / 1e6).toFixed(1)),
      ],
      [
        "NOPAT",
        ...projections.years.map((y) => +(y.nopat / 1e6).toFixed(1)),
      ],
      ["(+) D&A", ...projections.years.map((y) => +(y.da / 1e6).toFixed(1))],
      [
        "(-) CapEx",
        ...projections.years.map((y) => +(y.capex / 1e6).toFixed(1)),
      ],
      [
        "(-) Change in WC",
        ...projections.years.map((y) => +(y.dwc / 1e6).toFixed(1)),
      ],
      [
        "Unlevered FCF",
        ...projections.years.map((y) => +(y.ufcf / 1e6).toFixed(1)),
      ],
      [],
      [
        "Discount Factor",
        ...projections.years.map((y) => +y.df.toFixed(4)),
      ],
      [
        "PV of FCF",
        ...projections.years.map((y) => +(y.pvFCF / 1e6).toFixed(1)),
      ],
      [],
      ["Valuation Summary"],
      ["PV of FCFs", +(projections.pvFCFs / 1e6).toFixed(1)],
      ["Terminal Value", +(projections.terminalValue / 1e6).toFixed(1)],
      ["PV of Terminal Value", +(projections.pvTerminal / 1e6).toFixed(1)],
      ["Enterprise Value", +(projections.enterpriseValue / 1e6).toFixed(1)],
      ["(-) Net Debt", +(projections.netDebt / 1e6).toFixed(1)],
      ["Equity Value", +(projections.equityValue / 1e6).toFixed(1)],
      [
        "Shares Outstanding (M)",
        +(projections.sharesOut / 1e6).toFixed(1),
      ],
      ["Implied Share Price", "$" + projections.impliedPrice.toFixed(2)],
      ["Current Price", "$" + projections.currentPrice.toFixed(2)],
      ["Upside / Downside", projections.upside.toFixed(1) + "%"],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(projRows),
      "Projections",
    );

    const sensRows = [
      ["Sensitivity Analysis — " + symbol],
      [],
      [
        "WACC \\ " +
          (sensitivity.isPerpetuity
            ? "Terminal Growth Rate"
            : "Exit Multiple"),
        ...sensitivity.secondaryVals.map((v) =>
          sensitivity.isPerpetuity ? v.toFixed(1) + "%" : v.toFixed(1) + "x",
        ),
      ],
      ...sensitivity.matrix.map((row, i) => [
        sensitivity.waccVals[i].toFixed(1) + "%",
        ...row.map((v) => (isNaN(v) ? "N/A" : "$" + v.toFixed(2))),
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(sensRows),
      "Sensitivity",
    );

    XLSX.writeFile(wb, `${symbol}_DCF_Model.xlsx`);
  }

  const historicalRows = secData?.annualData
    ? [...secData.annualData]
        .sort((a, b) => Number(a.fiscalYear) - Number(b.fiscalYear))
        .slice(-5)
    : [];

  const projectionLineItems: {
    label: string;
    values: number[];
    bold?: boolean;
    highlight?: boolean;
    separator?: boolean;
  }[] = [
    {
      label: "Revenue",
      values: projections.years.map((y) => y.revenue),
      bold: true,
    },
    {
      label: "EBITDA",
      values: projections.years.map((y) => y.ebitda),
    },
    {
      label: "(-) D&A",
      values: projections.years.map((y) => y.da),
    },
    {
      label: "EBIT",
      values: projections.years.map((y) => y.ebit),
      bold: true,
      separator: true,
    },
    {
      label: "(-) Taxes",
      values: projections.years.map((y) => y.taxes),
    },
    {
      label: "NOPAT",
      values: projections.years.map((y) => y.nopat),
      bold: true,
      separator: true,
    },
    {
      label: "(+) D&A",
      values: projections.years.map((y) => y.da),
    },
    {
      label: "(-) CapEx",
      values: projections.years.map((y) => y.capex),
    },
    {
      label: "(-) ΔWC",
      values: projections.years.map((y) => y.dwc),
    },
    {
      label: "Unlevered FCF",
      values: projections.years.map((y) => y.ufcf),
      bold: true,
      highlight: true,
      separator: true,
    },
  ];

  const filingsSourceLabel =
    secData?.dataSource === "yahoo"
      ? "Yahoo Finance"
      : secData?.dataSource === "sec"
        ? "SEC EDGAR"
        : "Filings";

  return (
    <div className="space-y-6">
      <div className="sm:hidden mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent/80">
        ⚠ Financial models are best experienced on a larger screen. You can still
        view and interact with the model below.
      </div>
      <div className="flex justify-end">
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </button>
      </div>

      {/* Historical Financials */}
      {historicalRows.length > 0 && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-card-hover">
            <h3 className="text-sm font-semibold">
              Historical Financials ({filingsSourceLabel})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="px-4 py-2 font-medium">Item</th>
                  {historicalRows.map((r) => (
                    <th
                      key={r.fiscalYear}
                      className="px-4 py-2 font-medium text-right"
                    >
                      {r.fiscalYear}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium">Revenue</td>
                  {historicalRows.map((r) => (
                    <td
                      key={r.fiscalYear}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      {r.revenue != null ? fmtM(r.revenue) : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium">CapEx</td>
                  {historicalRows.map((r) => (
                    <td
                      key={r.fiscalYear}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      {cellPctOfRev(r.capex, r.revenue, true)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium">D&amp;A</td>
                  {historicalRows.map((r) => (
                    <td
                      key={r.fiscalYear}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      {cellPctOfRev(r.depreciation, r.revenue, false)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium">Operating CF</td>
                  {historicalRows.map((r) => (
                    <td
                      key={r.fiscalYear}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      {r.operatingCashflow != null
                        ? fmtM(r.operatingCashflow)
                        : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium">Working Capital</td>
                  {historicalRows.map((r) => (
                    <td
                      key={r.fiscalYear}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      {r.workingCapital != null
                        ? fmtM(r.workingCapital)
                        : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium">Change in WC</td>
                  {historicalRows.map((r, i) => (
                    <td
                      key={r.fiscalYear}
                      className="px-4 py-2 text-right tabular-nums"
                    >
                      {cellDeltaWC(r, historicalRows[i - 1])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="sm:hidden text-xs text-muted text-center mt-1">
            ← scroll to see all columns →
          </p>
        </section>
      )}

      {/* Model Assumptions */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Model Assumptions</h3>
          <button
            onClick={() => {
              setGrowthRates(defaults.growthRates);
              setEbitdaMargins(defaults.ebitdaMargins);
              setCapexPct(defaults.capexPct);
              setDaPct(defaults.daPct);
              setTaxRate(defaults.taxRate);
              setWcPct(defaults.wcPct);
              setWacc(defaults.wacc);
              setTerminalMethod(defaults.terminalMethod);
              setTerminalGrowthRate(defaults.terminalGrowthRate);
              setExitMultiple(defaults.exitMultiple);
            }}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Reset to defaults
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-muted">
                <th className="text-left font-medium py-1 pr-4 min-w-[160px]">
                  Assumption
                </th>
                {projections.years.map((y) => (
                  <th
                    key={y.year}
                    className="text-center font-medium py-1 px-2 min-w-[80px]"
                  >
                    {y.year}E
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5 pr-4 font-medium">
                  Revenue Growth (%)
                </td>
                {growthRates.map((rate, i) => (
                  <td key={i} className="py-1.5 px-1">
                    <input
                      type="number"
                      step="0.5"
                      value={rate}
                      onChange={(e) => {
                        const next = [...growthRates];
                        next[i] = parseFloat(e.target.value) || 0;
                        setGrowthRates(next);
                      }}
                      className="w-full rounded bg-background border border-border px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:border-accent transition-colors"
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 pr-4 font-medium">EBITDA Margin (%)</td>
                {ebitdaMargins.map((margin, i) => (
                  <td key={i} className="py-1.5 px-1">
                    <input
                      type="number"
                      step="0.5"
                      value={margin}
                      onChange={(e) => {
                        const next = [...ebitdaMargins];
                        next[i] = parseFloat(e.target.value) || 0;
                        setEbitdaMargins(next);
                      }}
                      className="w-full rounded bg-background border border-border px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:border-accent transition-colors"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sm:hidden text-xs text-muted text-center mt-1">
          ← scroll to see all columns →
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
          {(
            [
              { label: "WACC (%)", value: wacc, setter: setWacc, step: 0.25 },
              {
                label: "Tax Rate (%)",
                value: taxRate,
                setter: setTaxRate,
                step: 1,
              },
              {
                label: "CapEx (% Rev)",
                value: capexPct,
                setter: setCapexPct,
                step: 0.5,
              },
              {
                label: "D&A (% Rev)",
                value: daPct,
                setter: setDaPct,
                step: 0.5,
              },
              {
                label: "ΔWC (% ΔRev)",
                value: wcPct,
                setter: setWcPct,
                step: 0.5,
              },
            ] as const
          ).map(({ label, value, setter, step }) => (
            <div key={label}>
              <label className="text-xs text-muted block mb-1">{label}</label>
              <input
                type="number"
                step={step}
                value={value}
                onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                className="w-full rounded bg-background border border-border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="text-xs text-muted block mb-1">
              Terminal Value Method
            </label>
            <select
              value={terminalMethod}
              onChange={(e) =>
                setTerminalMethod(
                  e.target.value as "perpetuity" | "exitMultiple",
                )
              }
              className="w-full rounded bg-background border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              <option value="perpetuity">Perpetuity Growth</option>
              <option value="exitMultiple">Exit Multiple</option>
            </select>
          </div>

          {terminalMethod === "perpetuity" ? (
            <div>
              <label className="text-xs text-muted block mb-1">
                Terminal Growth (%)
              </label>
              <input
                type="number"
                step={0.25}
                value={terminalGrowthRate}
                onChange={(e) =>
                  setTerminalGrowthRate(parseFloat(e.target.value) || 0)
                }
                className="w-full rounded bg-background border border-border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted block mb-1">
                Exit EV/EBITDA (x)
              </label>
              <input
                type="number"
                step={0.5}
                value={exitMultiple}
                onChange={(e) =>
                  setExitMultiple(parseFloat(e.target.value) || 0)
                }
                className="w-full rounded bg-background border border-border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          )}
        </div>
      </section>

      {/* Projected Free Cash Flow */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-card-hover space-y-1">
          <h3 className="text-sm font-semibold">Projected Free Cash Flow</h3>
          <p className="text-xs text-muted">
            Base column is the last completed fiscal year (
            {fiscalBridge
              ? `FY ${fiscalBridge.fiscalYear} · ${filingsSourceLabel}`
              : "no filing data"}
            ). Forecasts still grow from LTM revenue in the quote (
            {fmtM(projections.baseRevenue)}).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-4 py-2 font-medium min-w-[140px]">
                  ($ millions)
                </th>
                <th className="px-4 py-2 font-medium text-right min-w-[100px]">
                  <span className="block">Base</span>
                  {fiscalBridge ? (
                    <span className="block text-[10px] font-normal text-muted normal-case">
                      FY {fiscalBridge.fiscalYear}
                    </span>
                  ) : null}
                </th>
                {projections.years.map((y) => (
                  <th
                    key={y.year}
                    className="px-4 py-2 font-medium text-right min-w-[90px]"
                  >
                    {y.year}E
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectionLineItems.map(
                ({ label, values, bold, highlight, separator }) => (
                  <tr
                    key={label}
                    className={`${highlight ? "bg-accent/5" : ""} ${separator ? "border-b border-border" : "border-b border-border/30"}`}
                  >
                    <td
                      className={`px-4 py-2 ${bold ? "font-semibold" : ""}`}
                    >
                      {label}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {renderFiscalBaseCell(label, fiscalBridge)}
                    </td>
                    {values.map((v, i) => (
                      <td
                        key={i}
                        className={`px-4 py-2 text-right tabular-nums ${bold ? "font-semibold" : ""}`}
                      >
                        {fmtM(v)}
                      </td>
                    ))}
                  </tr>
                ),
              )}

              <tr className="border-b border-border/30">
                <td className="px-4 py-2 text-muted">Discount Factor</td>
                <td className="px-4 py-2 text-right">—</td>
                {projections.years.map((y, i) => (
                  <td
                    key={i}
                    className="px-4 py-2 text-right tabular-nums text-muted"
                  >
                    {y.df.toFixed(3)}
                  </td>
                ))}
              </tr>
              <tr className="bg-accent/5">
                <td className="px-4 py-2 font-semibold">PV of FCF</td>
                <td className="px-4 py-2 text-right">—</td>
                {projections.years.map((y, i) => (
                  <td
                    key={i}
                    className="px-4 py-2 text-right tabular-nums font-semibold"
                  >
                    {fmtM(y.pvFCF)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sm:hidden text-xs text-muted text-center mt-1">
          ← scroll to see all columns →
        </p>
      </section>

      {/* Valuation Summary */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Valuation Bridge</h3>
          <div className="space-y-2 text-sm">
            {(
              [
                {
                  label: "PV of Projected FCFs",
                  value: projections.pvFCFs,
                  bold: false,
                },
                {
                  label: "PV of Terminal Value",
                  value: projections.pvTerminal,
                  bold: false,
                },
                {
                  label: "Enterprise Value",
                  value: projections.enterpriseValue,
                  bold: true,
                },
                { label: "(-) Net Debt", value: projections.netDebt, bold: false },
                {
                  label: "Equity Value",
                  value: projections.equityValue,
                  bold: true,
                },
              ] as const
            ).map(({ label, value, bold }) => (
              <div
                key={label}
                className={`flex justify-between ${bold ? "font-semibold border-t border-border pt-2" : ""}`}
              >
                <span>{label}</span>
                <span className="tabular-nums">{fmtB(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Implied Share Price</h3>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold tabular-nums font-mono">
                ${projections.impliedPrice.toFixed(2)}
              </p>
              <p className="text-xs text-muted mt-1">
                Based on {fmtM(projections.sharesOut)} shares outstanding
              </p>
            </div>
            <div
              className={`text-sm font-medium ${projections.upside >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              <span className="flex items-center gap-1">
                {projections.upside >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {projections.upside >= 0 ? "+" : ""}
                {projections.upside.toFixed(1)}%
              </span>
              <span className="text-xs text-muted block">
                vs current ${projections.currentPrice.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Terminal Value</span>
              <span className="tabular-nums">
                {fmtB(projections.terminalValue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">TV as % of EV</span>
              <span className="tabular-nums">
                {projections.enterpriseValue > 0
                  ? (
                      (projections.pvTerminal / projections.enterpriseValue) *
                      100
                    ).toFixed(1) + "%"
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sensitivity Analysis */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-card-hover">
          <h3 className="text-sm font-semibold">
            Sensitivity Analysis — WACC vs.{" "}
            {sensitivity.isPerpetuity
              ? "Terminal Growth Rate"
              : "Exit Multiple"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-center text-muted border-b border-border">
                <th className="px-4 py-2 font-medium min-w-[80px]">
                  WACC ↓ /{" "}
                  {sensitivity.isPerpetuity ? "TGR →" : "Multiple →"}
                </th>
                {sensitivity.secondaryVals.map((v, i) => (
                  <th key={i} className="px-4 py-2 font-medium min-w-[80px]">
                    {sensitivity.isPerpetuity
                      ? v.toFixed(1) + "%"
                      : v.toFixed(1) + "x"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.matrix.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30">
                  <td className="px-4 py-2 font-medium text-center text-muted">
                    {sensitivity.waccVals[ri].toFixed(1)}%
                  </td>
                  {row.map((val, ci) => {
                    const isCenter = ri === 2 && ci === 2;
                    const upVal = !isNaN(val)
                      ? ((val - projections.currentPrice) /
                          projections.currentPrice) *
                        100
                      : NaN;
                    return (
                      <td
                        key={ci}
                        className={`px-4 py-2 text-center tabular-nums ${
                          isCenter
                            ? "font-bold ring-2 ring-accent/40 rounded"
                            : ""
                        } ${
                          isNaN(val)
                            ? "text-muted"
                            : upVal >= 20
                              ? "text-green-500"
                              : upVal >= 0
                                ? "text-green-400/80"
                                : upVal >= -20
                                  ? "text-red-400"
                                  : "text-red-500"
                        }`}
                      >
                        {isNaN(val) ? "N/A" : "$" + val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sm:hidden text-xs text-muted text-center mt-1">
          ← scroll to see all columns →
        </p>
      </section>
    </div>
  );
}

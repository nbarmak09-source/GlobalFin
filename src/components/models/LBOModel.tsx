"use client";

import { useState, useMemo } from "react";
import type { QuoteSummaryData, SECFinancials } from "@/lib/types";
import LatestFiscalBaseSummary from "@/components/models/LatestFiscalBaseSummary";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";

interface LBOModelProps {
  data: QuoteSummaryData;
  secData: SECFinancials | null;
  symbol: string;
}

const NUM_YEARS = 5;

function fmtB(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtM(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function pctStr(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

function deriveDefaults(
  data: QuoteSummaryData,
  secData: SECFinancials | null,
) {
  const ltmEBITDA = data.ebitda || 0;
  const currentEV = data.enterpriseValue || 0;
  const impliedMultiple =
    ltmEBITDA > 0 ? currentEV / ltmEBITDA : 10;

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
    if (latest.revenue && latest.capex) {
      capexPct =
        Math.round((Math.abs(latest.capex) / latest.revenue) * 1000) / 10;
    }
    if (latest.revenue && latest.depreciation) {
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
    entryMultiple: Math.round(impliedMultiple * 10) / 10,
    exitMultiple: Math.round(impliedMultiple * 10) / 10,
    exitYear: 5,
    equityPct: 40,
    seniorDebtPct: 40,
    subDebtPct: 20,
    seniorRate: 6,
    subRate: 10,
    seniorAmortPct: 5,
    feesPct: 3,
    growthRates,
    ebitdaMargins: Array(NUM_YEARS).fill(
      Math.round(ebitdaMarginPct * 10) / 10,
    ) as number[],
    capexPct,
    daPct,
    taxRate: 21,
    wcPct,
    cashSweepPct: 75,
  };
}

export default function LBOModel({
  data,
  secData,
  symbol,
}: LBOModelProps) {
  const defaults = useMemo(
    () => deriveDefaults(data, secData),
    [data, secData],
  );

  // Transaction assumptions
  const [entryMultiple, setEntryMultiple] = useState(defaults.entryMultiple);
  const [exitMultiple, setExitMultiple] = useState(defaults.exitMultiple);
  const [exitYear, setExitYear] = useState(defaults.exitYear);
  const [equityPct, setEquityPct] = useState(defaults.equityPct);
  const [seniorDebtPct, setSeniorDebtPct] = useState(defaults.seniorDebtPct);
  const [subDebtPct, setSubDebtPct] = useState(defaults.subDebtPct);
  const [seniorRate, setSeniorRate] = useState(defaults.seniorRate);
  const [subRate, setSubRate] = useState(defaults.subRate);
  const [seniorAmortPct, setSeniorAmortPct] = useState(
    defaults.seniorAmortPct,
  );
  const [feesPct, setFeesPct] = useState(defaults.feesPct);
  const [cashSweepPct, setCashSweepPct] = useState(defaults.cashSweepPct);

  // Operating assumptions
  const [growthRates, setGrowthRates] = useState(defaults.growthRates);
  const [ebitdaMargins, setEbitdaMargins] = useState(defaults.ebitdaMargins);
  const [capexPct, setCapexPct] = useState(defaults.capexPct);
  const [daPct, setDaPct] = useState(defaults.daPct);
  const [taxRate, setTaxRate] = useState(defaults.taxRate);
  const [wcPct, setWcPct] = useState(defaults.wcPct);

  const model = useMemo(() => {
    const ltmEBITDA = data.ebitda || 0;
    const baseRevenue = data.totalRevenue || 0;

    // Sources & Uses
    const purchaseEV = ltmEBITDA * entryMultiple;
    const fees = purchaseEV * (feesPct / 100);
    const totalUses = purchaseEV + fees;

    const sponsorEquity = totalUses * (equityPct / 100);
    const seniorDebt = totalUses * (seniorDebtPct / 100);
    const subDebt = totalUses * (subDebtPct / 100);
    const totalSources = sponsorEquity + seniorDebt + subDebt;
    const plug = totalUses - totalSources;

    // Projections
    const years: {
      year: number;
      revenue: number;
      ebitda: number;
      da: number;
      ebit: number;
      interestSenior: number;
      interestSub: number;
      totalInterest: number;
      ebt: number;
      taxes: number;
      netIncome: number;
      capex: number;
      dwc: number;
      fcf: number;
      mandatoryAmort: number;
      optionalPaydown: number;
      totalDebtRepaid: number;
      seniorBegin: number;
      seniorEnd: number;
      subBegin: number;
      subEnd: number;
      totalDebtEnd: number;
      netDebtEnd: number;
      cumulativeCash: number;
    }[] = [];

    let prevRevenue = baseRevenue;
    let srBal = seniorDebt;
    let subBal = subDebt;
    let cumulativeCash = 0;

    for (let i = 0; i < NUM_YEARS; i++) {
      const revenue = prevRevenue * (1 + growthRates[i] / 100);
      const ebitda = revenue * (ebitdaMargins[i] / 100);
      const da = revenue * (daPct / 100);
      const ebit = ebitda - da;

      const interestSenior = srBal * (seniorRate / 100);
      const interestSub = subBal * (subRate / 100);
      const totalInterest = interestSenior + interestSub;

      const ebt = ebit - totalInterest;
      const taxes = Math.max(ebt * (taxRate / 100), 0);
      const netIncome = ebt - taxes;
      const capex = revenue * (capexPct / 100);
      const dwc = (revenue - prevRevenue) * (wcPct / 100);
      const fcf = netIncome + da - capex - dwc;

      // Debt repayment
      const mandatoryAmort = Math.min(
        seniorDebt * (seniorAmortPct / 100),
        srBal,
      );
      const afterMandatory = Math.max(fcf - mandatoryAmort, 0);
      const sweepAmount = afterMandatory * (cashSweepPct / 100);

      // Apply sweep to senior first, then sub
      let srPaydown = Math.min(sweepAmount, srBal - mandatoryAmort > 0 ? srBal - mandatoryAmort : 0);
      let subPaydown = Math.min(sweepAmount - srPaydown, subBal);
      if (subPaydown < 0) subPaydown = 0;

      const srBegin = srBal;
      const subBegin = subBal;
      srBal = Math.max(srBal - mandatoryAmort - srPaydown, 0);
      subBal = Math.max(subBal - subPaydown, 0);

      const totalDebtRepaid = mandatoryAmort + srPaydown + subPaydown;
      const excessCash = Math.max(fcf - totalDebtRepaid, 0);
      cumulativeCash += excessCash;

      years.push({
        year: new Date().getFullYear() + i + 1,
        revenue,
        ebitda,
        da,
        ebit,
        interestSenior,
        interestSub,
        totalInterest,
        ebt,
        taxes,
        netIncome,
        capex,
        dwc,
        fcf,
        mandatoryAmort,
        optionalPaydown: srPaydown + subPaydown,
        totalDebtRepaid,
        seniorBegin: srBegin,
        seniorEnd: srBal,
        subBegin: subBegin,
        subEnd: subBal,
        totalDebtEnd: srBal + subBal,
        netDebtEnd: srBal + subBal - cumulativeCash,
        cumulativeCash,
      });

      prevRevenue = revenue;
    }

    // Exit analysis
    const exitIdx = Math.min(exitYear, NUM_YEARS) - 1;
    const exitYearData = years[exitIdx];
    const exitEV = exitYearData.ebitda * exitMultiple;
    const remainingDebt = exitYearData.totalDebtEnd;
    const exitEquity = exitEV - remainingDebt + exitYearData.cumulativeCash;
    const moic = sponsorEquity > 0 ? exitEquity / sponsorEquity : 0;
    const irr =
      moic > 0 && exitYear > 0
        ? (Math.pow(moic, 1 / exitYear) - 1) * 100
        : 0;

    return {
      ltmEBITDA,
      baseRevenue,
      purchaseEV,
      fees,
      totalUses,
      sponsorEquity,
      seniorDebt,
      subDebt,
      totalSources,
      plug,
      years,
      exitEV,
      remainingDebt,
      exitEquity,
      moic,
      irr,
      exitYearData,
    };
  }, [
    data,
    entryMultiple,
    exitMultiple,
    exitYear,
    equityPct,
    seniorDebtPct,
    subDebtPct,
    seniorRate,
    subRate,
    seniorAmortPct,
    feesPct,
    cashSweepPct,
    growthRates,
    ebitdaMargins,
    capexPct,
    daPct,
    taxRate,
    wcPct,
  ]);

  // Sensitivity: IRR across entry multiple vs exit multiple
  const sensitivity = useMemo(() => {
    const entryVals = [-2, -1, 0, 1, 2].map((d) => entryMultiple + d);
    const exitVals = [-2, -1, 0, 1, 2].map((d) => exitMultiple + d);

    const matrix = entryVals.map((em) =>
      exitVals.map((xm) => {
        const ltmEBITDA = data.ebitda || 0;
        const baseRevenue = data.totalRevenue || 0;
        const pEV = ltmEBITDA * em;
        const pFees = pEV * (feesPct / 100);
        const tUses = pEV + pFees;
        const sEquity = tUses * (equityPct / 100);
        const sDbt = tUses * (seniorDebtPct / 100);
        const subDbt = tUses * (subDebtPct / 100);

        let srB = sDbt;
        let subB = subDbt;
        let prevRev = baseRevenue;
        let cumCash = 0;
        let exitEBITDA = 0;

        for (let i = 0; i < exitYear; i++) {
          const rev = prevRev * (1 + growthRates[i] / 100);
          const ebitda = rev * (ebitdaMargins[i] / 100);
          const da = rev * (daPct / 100);
          const ebit = ebitda - da;
          const intSr = srB * (seniorRate / 100);
          const intSub = subB * (subRate / 100);
          const ebt = ebit - intSr - intSub;
          const tx = Math.max(ebt * (taxRate / 100), 0);
          const ni = ebt - tx;
          const capex = rev * (capexPct / 100);
          const dwc = (rev - prevRev) * (wcPct / 100);
          const fcf = ni + da - capex - dwc;

          const mAmort = Math.min(sDbt * (seniorAmortPct / 100), srB);
          const afterM = Math.max(fcf - mAmort, 0);
          const sweep = afterM * (cashSweepPct / 100);
          const srP = Math.min(sweep, Math.max(srB - mAmort, 0));
          const subP = Math.min(Math.max(sweep - srP, 0), subB);
          srB = Math.max(srB - mAmort - srP, 0);
          subB = Math.max(subB - subP, 0);
          cumCash += Math.max(fcf - mAmort - srP - subP, 0);
          exitEBITDA = ebitda;
          prevRev = rev;
        }

        const xEV = exitEBITDA * xm;
        const xEquity = xEV - srB - subB + cumCash;
        const m = sEquity > 0 ? xEquity / sEquity : 0;
        return m > 0 && exitYear > 0
          ? (Math.pow(m, 1 / exitYear) - 1) * 100
          : NaN;
      }),
    );

    return { entryVals, exitVals, matrix };
  }, [
    entryMultiple,
    exitMultiple,
    exitYear,
    data,
    equityPct,
    seniorDebtPct,
    subDebtPct,
    seniorRate,
    subRate,
    seniorAmortPct,
    feesPct,
    cashSweepPct,
    growthRates,
    ebitdaMargins,
    capexPct,
    daPct,
    taxRate,
    wcPct,
  ]);

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sources & Uses
    const suRows = [
      ["LBO Model — " + symbol],
      [],
      ["Sources & Uses"],
      [],
      ["Sources", "", "Uses"],
      [
        "Senior Debt",
        +(model.seniorDebt / 1e6).toFixed(1),
        "Enterprise Value",
        +(model.purchaseEV / 1e6).toFixed(1),
      ],
      [
        "Subordinated Debt",
        +(model.subDebt / 1e6).toFixed(1),
        "Fees & Expenses",
        +(model.fees / 1e6).toFixed(1),
      ],
      [
        "Sponsor Equity",
        +(model.sponsorEquity / 1e6).toFixed(1),
        "",
        "",
      ],
      [
        "Total Sources",
        +(model.totalSources / 1e6).toFixed(1),
        "Total Uses",
        +(model.totalUses / 1e6).toFixed(1),
      ],
      [],
      ["Key Assumptions"],
      ["Entry Multiple", entryMultiple + "x"],
      ["Exit Multiple", exitMultiple + "x"],
      ["Hold Period", exitYear + " years"],
      ["Equity %", equityPct + "%"],
      ["Senior Debt %", seniorDebtPct + "%"],
      ["Sub Debt %", subDebtPct + "%"],
      ["Senior Rate", seniorRate + "%"],
      ["Sub Rate", subRate + "%"],
      ["Senior Amort", seniorAmortPct + "% / yr"],
      ["Cash Sweep", cashSweepPct + "%"],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(suRows),
      "Sources & Uses",
    );

    // Projections
    const projRows = [
      ["Projections — " + symbol],
      [],
      ["($ millions)", ...model.years.map((y) => y.year)],
      [
        "Revenue",
        ...model.years.map((y) => +(y.revenue / 1e6).toFixed(1)),
      ],
      [
        "EBITDA",
        ...model.years.map((y) => +(y.ebitda / 1e6).toFixed(1)),
      ],
      [
        "(-) D&A",
        ...model.years.map((y) => +(y.da / 1e6).toFixed(1)),
      ],
      [
        "EBIT",
        ...model.years.map((y) => +(y.ebit / 1e6).toFixed(1)),
      ],
      [
        "(-) Interest",
        ...model.years.map((y) => +(y.totalInterest / 1e6).toFixed(1)),
      ],
      [
        "EBT",
        ...model.years.map((y) => +(y.ebt / 1e6).toFixed(1)),
      ],
      [
        "(-) Taxes",
        ...model.years.map((y) => +(y.taxes / 1e6).toFixed(1)),
      ],
      [
        "Net Income",
        ...model.years.map((y) => +(y.netIncome / 1e6).toFixed(1)),
      ],
      [],
      [
        "FCF for Debt Repayment",
        ...model.years.map((y) => +(y.fcf / 1e6).toFixed(1)),
      ],
      [],
      ["Debt Schedule"],
      [
        "Senior — Begin",
        ...model.years.map((y) => +(y.seniorBegin / 1e6).toFixed(1)),
      ],
      [
        "Senior — End",
        ...model.years.map((y) => +(y.seniorEnd / 1e6).toFixed(1)),
      ],
      [
        "Sub — Begin",
        ...model.years.map((y) => +(y.subBegin / 1e6).toFixed(1)),
      ],
      [
        "Sub — End",
        ...model.years.map((y) => +(y.subEnd / 1e6).toFixed(1)),
      ],
      [
        "Total Debt",
        ...model.years.map((y) => +(y.totalDebtEnd / 1e6).toFixed(1)),
      ],
      [],
      ["Returns"],
      ["Exit EV", +(model.exitEV / 1e6).toFixed(1)],
      ["(-) Remaining Debt", +(model.remainingDebt / 1e6).toFixed(1)],
      ["Equity to Sponsor", +(model.exitEquity / 1e6).toFixed(1)],
      ["MOIC", model.moic.toFixed(2) + "x"],
      ["IRR", model.irr.toFixed(1) + "%"],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(projRows),
      "Projections",
    );

    // Sensitivity
    const sensRows = [
      ["IRR Sensitivity — Entry vs Exit Multiple"],
      [],
      [
        "Entry ↓ / Exit →",
        ...sensitivity.exitVals.map((v) => v.toFixed(1) + "x"),
      ],
      ...sensitivity.matrix.map((row, i) => [
        sensitivity.entryVals[i].toFixed(1) + "x",
        ...row.map((v) => (isNaN(v) ? "N/A" : v.toFixed(1) + "%")),
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(sensRows),
      "Sensitivity",
    );

    XLSX.writeFile(wb, `${symbol}_LBO_Model.xlsx`);
  }

  const inputCls =
    "w-full rounded bg-background border border-border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:border-accent transition-colors";
  const inputCenterCls =
    "w-full rounded bg-background border border-border px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:border-accent transition-colors";

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          LTM EBITDA: {fmtB(model.ltmEBITDA)} &middot; LTM Revenue:{" "}
          {fmtB(model.baseRevenue)}
        </p>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </button>
      </div>

      {/* Transaction Assumptions */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Transaction Assumptions</h3>
          <button
            onClick={() => {
              setEntryMultiple(defaults.entryMultiple);
              setExitMultiple(defaults.exitMultiple);
              setExitYear(defaults.exitYear);
              setEquityPct(defaults.equityPct);
              setSeniorDebtPct(defaults.seniorDebtPct);
              setSubDebtPct(defaults.subDebtPct);
              setSeniorRate(defaults.seniorRate);
              setSubRate(defaults.subRate);
              setSeniorAmortPct(defaults.seniorAmortPct);
              setFeesPct(defaults.feesPct);
              setCashSweepPct(defaults.cashSweepPct);
              setGrowthRates(defaults.growthRates);
              setEbitdaMargins(defaults.ebitdaMargins);
              setCapexPct(defaults.capexPct);
              setDaPct(defaults.daPct);
              setTaxRate(defaults.taxRate);
              setWcPct(defaults.wcPct);
            }}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Reset to defaults
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-muted block mb-1">
              Entry EV/EBITDA (x)
            </label>
            <input
              type="number"
              step={0.5}
              value={entryMultiple}
              onChange={(e) =>
                setEntryMultiple(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
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
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Hold Period (yrs)
            </label>
            <select
              value={exitYear}
              onChange={(e) => setExitYear(parseInt(e.target.value))}
              className={inputCls}
            >
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Sponsor Equity (%)
            </label>
            <input
              type="number"
              step={5}
              value={equityPct}
              onChange={(e) =>
                setEquityPct(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Fees & Expenses (%)
            </label>
            <input
              type="number"
              step={0.5}
              value={feesPct}
              onChange={(e) =>
                setFeesPct(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2 border-t border-border">
          <div>
            <label className="text-xs text-muted block mb-1">
              Senior Debt (% of total)
            </label>
            <input
              type="number"
              step={5}
              value={seniorDebtPct}
              onChange={(e) =>
                setSeniorDebtPct(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Sub Debt (% of total)
            </label>
            <input
              type="number"
              step={5}
              value={subDebtPct}
              onChange={(e) =>
                setSubDebtPct(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Senior Rate (%)
            </label>
            <input
              type="number"
              step={0.25}
              value={seniorRate}
              onChange={(e) =>
                setSeniorRate(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Sub Rate (%)
            </label>
            <input
              type="number"
              step={0.25}
              value={subRate}
              onChange={(e) =>
                setSubRate(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Senior Amort (% / yr)
            </label>
            <input
              type="number"
              step={1}
              value={seniorAmortPct}
              onChange={(e) =>
                setSeniorAmortPct(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">
              Cash Sweep (%)
            </label>
            <input
              type="number"
              step={5}
              value={cashSweepPct}
              onChange={(e) =>
                setCashSweepPct(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Sources & Uses */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Sources</h3>
          <div className="space-y-2 text-sm">
            {[
              {
                label: "Senior Debt",
                value: model.seniorDebt,
                pct: seniorDebtPct,
              },
              {
                label: "Subordinated Debt",
                value: model.subDebt,
                pct: subDebtPct,
              },
              {
                label: "Sponsor Equity",
                value: model.sponsorEquity,
                pct: equityPct,
              },
            ].map(({ label, value, pct }) => (
              <div key={label} className="flex justify-between">
                <span>
                  {label}{" "}
                  <span className="text-muted text-xs">({pct}%)</span>
                </span>
                <span className="tabular-nums">{fmtB(value)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t border-border pt-2">
              <span>Total Sources</span>
              <span className="tabular-nums">{fmtB(model.totalSources)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Uses</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>
                Enterprise Value{" "}
                <span className="text-muted text-xs">
                  ({entryMultiple}x EBITDA)
                </span>
              </span>
              <span className="tabular-nums">{fmtB(model.purchaseEV)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                Fees & Expenses{" "}
                <span className="text-muted text-xs">({feesPct}%)</span>
              </span>
              <span className="tabular-nums">{fmtB(model.fees)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-2">
              <span>Total Uses</span>
              <span className="tabular-nums">{fmtB(model.totalUses)}</span>
            </div>
            {Math.abs(model.plug) > 1 && (
              <div className="flex justify-between text-xs text-red-400">
                <span>Plug (Sources − Uses)</span>
                <span className="tabular-nums">{fmtB(model.plug)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <LatestFiscalBaseSummary secData={secData} data={data} />

      {/* Operating Assumptions */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Operating Assumptions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted">
                <th className="text-left font-medium py-1 pr-4 min-w-[160px]">
                  Assumption
                </th>
                {model.years.map((y) => (
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
                      className={inputCenterCls}
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
                      className={inputCenterCls}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
          {[
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
          ].map(({ label, value, setter, step }) => (
            <div key={label}>
              <label className="text-xs text-muted block mb-1">{label}</label>
              <input
                type="number"
                step={step}
                value={value}
                onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Income Statement + FCF */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-card-hover">
          <h3 className="text-sm font-semibold">
            Income Statement &amp; Free Cash Flow
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-4 py-2 font-medium min-w-[160px]">
                  ($ millions)
                </th>
                {model.years.map((y) => (
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
              {(
                [
                  {
                    label: "Revenue",
                    vals: model.years.map((y) => y.revenue),
                    bold: true,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "EBITDA",
                    vals: model.years.map((y) => y.ebitda),
                    bold: false,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "(-) D&A",
                    vals: model.years.map((y) => y.da),
                    bold: false,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "EBIT",
                    vals: model.years.map((y) => y.ebit),
                    bold: true,
                    sep: true,
                    hl: false,
                  },
                  {
                    label: "(-) Interest",
                    vals: model.years.map((y) => y.totalInterest),
                    bold: false,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "EBT",
                    vals: model.years.map((y) => y.ebt),
                    bold: false,
                    sep: true,
                    hl: false,
                  },
                  {
                    label: "(-) Taxes",
                    vals: model.years.map((y) => y.taxes),
                    bold: false,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "Net Income",
                    vals: model.years.map((y) => y.netIncome),
                    bold: true,
                    sep: true,
                    hl: false,
                  },
                  {
                    label: "(+) D&A",
                    vals: model.years.map((y) => y.da),
                    bold: false,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "(-) CapEx",
                    vals: model.years.map((y) => y.capex),
                    bold: false,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "(-) ΔWC",
                    vals: model.years.map((y) => y.dwc),
                    bold: false,
                    sep: false,
                    hl: false,
                  },
                  {
                    label: "Levered FCF",
                    vals: model.years.map((y) => y.fcf),
                    bold: true,
                    sep: true,
                    hl: true,
                  },
                ] as const
              ).map(({ label, vals, bold, sep, hl }) => (
                <tr
                  key={label}
                  className={`${hl ? "bg-accent/5" : ""} ${sep ? "border-b border-border" : "border-b border-border/30"}`}
                >
                  <td
                    className={`px-4 py-2 ${bold ? "font-semibold" : ""}`}
                  >
                    {label}
                  </td>
                  {vals.map((v, i) => (
                    <td
                      key={i}
                      className={`px-4 py-2 text-right tabular-nums ${bold ? "font-semibold" : ""}`}
                    >
                      {fmtM(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Debt Schedule */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-card-hover">
          <h3 className="text-sm font-semibold">Debt Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-4 py-2 font-medium min-w-[160px]">
                  ($ millions)
                </th>
                {model.years.map((y) => (
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
              {(
                [
                  {
                    label: "Senior — Beginning",
                    vals: model.years.map((y) => y.seniorBegin),
                    bold: false,
                    sep: false,
                  },
                  {
                    label: "(-) Mandatory Amort",
                    vals: model.years.map((y) => y.mandatoryAmort),
                    bold: false,
                    sep: false,
                  },
                  {
                    label: "(-) Optional Paydown",
                    vals: model.years.map((y) => y.optionalPaydown),
                    bold: false,
                    sep: false,
                  },
                  {
                    label: "Senior — Ending",
                    vals: model.years.map((y) => y.seniorEnd),
                    bold: true,
                    sep: true,
                  },
                  {
                    label: "Sub — Beginning",
                    vals: model.years.map((y) => y.subBegin),
                    bold: false,
                    sep: false,
                  },
                  {
                    label: "Sub — Ending",
                    vals: model.years.map((y) => y.subEnd),
                    bold: true,
                    sep: true,
                  },
                  {
                    label: "Total Debt",
                    vals: model.years.map((y) => y.totalDebtEnd),
                    bold: true,
                    sep: false,
                  },
                ] as const
              ).map(({ label, vals, bold, sep }) => (
                <tr
                  key={label}
                  className={`${sep ? "border-b border-border" : "border-b border-border/30"}`}
                >
                  <td
                    className={`px-4 py-2 ${bold ? "font-semibold" : ""}`}
                  >
                    {label}
                  </td>
                  {vals.map((v, i) => (
                    <td
                      key={i}
                      className={`px-4 py-2 text-right tabular-nums ${bold ? "font-semibold" : ""}`}
                    >
                      {fmtM(v)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-accent/5">
                <td className="px-4 py-2 font-semibold">
                  Leverage (Debt / EBITDA)
                </td>
                {model.years.map((y, i) => (
                  <td
                    key={i}
                    className="px-4 py-2 text-right tabular-nums font-semibold"
                  >
                    {y.ebitda > 0
                      ? (y.totalDebtEnd / y.ebitda).toFixed(1) + "x"
                      : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Returns Summary */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">
            Exit Analysis (Year {exitYear})
          </h3>
          <div className="space-y-2 text-sm">
            {[
              {
                label: `Exit EV (${exitMultiple}x EBITDA)`,
                value: model.exitEV,
                bold: false,
              },
              {
                label: "(-) Remaining Debt",
                value: model.remainingDebt,
                bold: false,
              },
              {
                label: "(+) Excess Cash",
                value: model.exitYearData.cumulativeCash,
                bold: false,
              },
              {
                label: "Equity to Sponsor",
                value: model.exitEquity,
                bold: true,
              },
            ].map(({ label, value, bold }) => (
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
          <h3 className="text-sm font-semibold">Sponsor Returns</h3>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-xs text-muted mb-1">MOIC</p>
              <p className="text-3xl font-bold tabular-nums font-mono">
                {model.moic.toFixed(2)}x
              </p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">IRR</p>
              <p
                className={`text-3xl font-bold tabular-nums font-mono ${model.irr >= 20 ? "text-green-500" : model.irr >= 0 ? "text-green-400/80" : "text-red-500"}`}
              >
                <span className="flex items-center gap-1">
                  {model.irr >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {model.irr.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Equity Invested</span>
              <span className="tabular-nums">
                {fmtB(model.sponsorEquity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Equity Returned</span>
              <span className="tabular-nums">
                {fmtB(model.exitEquity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Hold Period</span>
              <span className="tabular-nums">
                {exitYear} year{exitYear !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* IRR Sensitivity */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-card-hover">
          <h3 className="text-sm font-semibold">
            IRR Sensitivity — Entry Multiple vs. Exit Multiple
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-center text-muted border-b border-border">
                <th className="px-4 py-2 font-medium min-w-[100px]">
                  Entry ↓ / Exit →
                </th>
                {sensitivity.exitVals.map((v, i) => (
                  <th key={i} className="px-4 py-2 font-medium min-w-[70px]">
                    {v.toFixed(1)}x
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.matrix.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30">
                  <td className="px-4 py-2 font-medium text-center text-muted">
                    {sensitivity.entryVals[ri].toFixed(1)}x
                  </td>
                  {row.map((val, ci) => {
                    const isCenter = ri === 2 && ci === 2;
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
                            : val >= 25
                              ? "text-green-500"
                              : val >= 15
                                ? "text-green-400/80"
                                : val >= 0
                                  ? "text-yellow-500"
                                  : "text-red-500"
                        }`}
                      >
                        {isNaN(val) ? "N/A" : val.toFixed(1) + "%"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

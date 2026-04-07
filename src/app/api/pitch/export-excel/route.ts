import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

interface StockData {
  symbol: string;
  longName?: string;
  shortName?: string;
  sector?: string;
  industry?: string;
  regularMarketPrice?: number;
  marketCap?: number;
  totalRevenue?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  ebitdaMargins?: number;
  ebitda?: number;
  grossProfits?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  trailingEps?: number;
  forwardEps?: number;
  trailingPE?: number;
  forwardPE?: number;
  pegRatio?: number;
  priceToBook?: number;
  priceToSalesTrailing12Months?: number;
  enterpriseValue?: number;
  enterpriseToRevenue?: number;
  enterpriseToEbitda?: number;
  totalDebt?: number;
  totalCash?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  sharesOutstanding?: number;
  bookValue?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  beta?: number;
  dividendYield?: number;
  payoutRatio?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
  targetMedianPrice?: number;
  targetHighPrice?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  financialsChartYearly?: { date: string; revenue: number; earnings: number }[];
  earningsChartQuarterly?: { date: string; actual: number; estimate: number }[];
}

function pct(v?: number) {
  return v != null ? `${(v * 100).toFixed(1)}%` : "N/A";
}
function bn(v?: number) {
  return v != null ? `$${(v / 1e9).toFixed(2)}B` : "N/A";
}
function fmt(v?: number, decimals = 2) {
  return v != null ? v.toFixed(decimals) : "N/A";
}

function styleHeader(ws: XLSX.WorkSheet, range: XLSX.Range) {
  // XLSX community edition doesn't support cell styles, but we structure data clearly
  void ws;
  void range;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { stockData, sections, dcfAssumptions, peers } = body as {
      stockData: StockData;
      sections: Record<string, string>;
      dcfAssumptions?: { fcfGrowthRate: number; wacc: number; terminalGrowth: number };
      peers?: { symbol: string; name: string; marketCap: number | null; trailingPE: number | null; forwardPE: number | null; priceToBook: number | null; evToEbitda: number | null; revenueGrowth: number | null; grossMargins: number | null; operatingMargins: number | null; returnOnEquity: number | null }[];
    };

    if (!stockData?.symbol) {
      return NextResponse.json({ error: "stockData required" }, { status: 400 });
    }

    const wb = XLSX.utils.book_new();
    const companyName = stockData.longName ?? stockData.shortName ?? stockData.symbol;

    // ── Sheet 1: Summary ───────────────────────────────────────────────────
    const summaryData = [
      [`${companyName} (${stockData.symbol}) — Investment Pitch Summary`],
      [],
      ["Generated", new Date().toLocaleDateString()],
      ["Sector", stockData.sector ?? "N/A"],
      ["Industry", stockData.industry ?? "N/A"],
      [],
      ["CURRENT PRICE & MARKET DATA"],
      ["Current Price", stockData.regularMarketPrice != null ? `$${stockData.regularMarketPrice.toFixed(2)}` : "N/A"],
      ["Market Cap", bn(stockData.marketCap)],
      ["52-Week High", stockData.fiftyTwoWeekHigh != null ? `$${stockData.fiftyTwoWeekHigh.toFixed(2)}` : "N/A"],
      ["52-Week Low", stockData.fiftyTwoWeekLow != null ? `$${stockData.fiftyTwoWeekLow.toFixed(2)}` : "N/A"],
      ["Beta", fmt(stockData.beta)],
      [],
      ["ANALYST CONSENSUS"],
      ["Recommendation", stockData.recommendationKey?.toUpperCase() ?? "N/A"],
      ["# Analysts", stockData.numberOfAnalystOpinions ?? "N/A"],
      ["Price Target (Low)", stockData.targetLowPrice != null ? `$${stockData.targetLowPrice.toFixed(2)}` : "N/A"],
      ["Price Target (Mean)", stockData.targetMeanPrice != null ? `$${stockData.targetMeanPrice.toFixed(2)}` : "N/A"],
      ["Price Target (Median)", stockData.targetMedianPrice != null ? `$${stockData.targetMedianPrice.toFixed(2)}` : "N/A"],
      ["Price Target (High)", stockData.targetHighPrice != null ? `$${stockData.targetHighPrice.toFixed(2)}` : "N/A"],
      ["Upside (Mean)", stockData.regularMarketPrice != null && stockData.targetMeanPrice != null
        ? `${(((stockData.targetMeanPrice - stockData.regularMarketPrice) / stockData.regularMarketPrice) * 100).toFixed(1)}%`
        : "N/A"],
      [],
      ["OWNERSHIP"],
      ["Insider Ownership", pct(stockData.heldPercentInsiders)],
      ["Institutional Ownership", pct(stockData.heldPercentInstitutions)],
      ["Shares Outstanding", stockData.sharesOutstanding != null ? (stockData.sharesOutstanding / 1e6).toFixed(1) + "M" : "N/A"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // ── Sheet 2: Valuation Comps ───────────────────────────────────────────
    const valuationData = [
      ["VALUATION METRICS", companyName],
      [],
      ["Metric", "Value", "Notes"],
      ["Trailing P/E", fmt(stockData.trailingPE), "Price / Trailing 12M EPS"],
      ["Forward P/E", fmt(stockData.forwardPE), "Price / Next 12M EPS"],
      ["PEG Ratio", fmt(stockData.pegRatio), "P/E / Earnings Growth Rate"],
      ["Price/Book", fmt(stockData.priceToBook), "Market Price / Book Value per Share"],
      ["Price/Sales (TTM)", fmt(stockData.priceToSalesTrailing12Months), "Market Cap / Revenue"],
      ["EV/Revenue", fmt(stockData.enterpriseToRevenue), "Enterprise Value / Revenue"],
      ["EV/EBITDA", fmt(stockData.enterpriseToEbitda), "Enterprise Value / EBITDA"],
      [],
      ["Enterprise Value", bn(stockData.enterpriseValue), "Market Cap + Debt - Cash"],
      ["Trailing EPS", stockData.trailingEps != null ? `$${stockData.trailingEps.toFixed(2)}` : "N/A", ""],
      ["Forward EPS", stockData.forwardEps != null ? `$${stockData.forwardEps.toFixed(2)}` : "N/A", ""],
      ["Book Value/Share", stockData.bookValue != null ? `$${stockData.bookValue.toFixed(2)}` : "N/A", ""],
      [],
      ["QUICK FAIR VALUE CHECK"],
      ["Current Price", stockData.regularMarketPrice != null ? `$${stockData.regularMarketPrice.toFixed(2)}` : "N/A", ""],
      ["Implied Price @ 20x Fwd P/E",
        stockData.forwardEps != null ? `$${(stockData.forwardEps * 20).toFixed(2)}` : "N/A", ""],
      ["Implied Price @ 25x Fwd P/E",
        stockData.forwardEps != null ? `$${(stockData.forwardEps * 25).toFixed(2)}` : "N/A", ""],
      ["Implied Price @ 30x Fwd P/E",
        stockData.forwardEps != null ? `$${(stockData.forwardEps * 30).toFixed(2)}` : "N/A", ""],
    ];
    const wsValuation = XLSX.utils.aoa_to_sheet(valuationData);
    wsValuation["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsValuation, "Valuation");

    // ── Sheet 3: Financial Model ───────────────────────────────────────────
    const currentRevenue = stockData.totalRevenue ?? 0;
    const revenueGrowthRate = stockData.revenueGrowth ?? 0.10;
    const opMargin = stockData.operatingMargins ?? 0.15;
    const ebitdaMargin = stockData.ebitdaMargins ?? 0.20;

    const projectionYears = [1, 2, 3, 4, 5];
    const projections = projectionYears.map((yr) => {
      const rev = currentRevenue * Math.pow(1 + revenueGrowthRate, yr);
      const ebitda = rev * ebitdaMargin;
      const ebit = rev * opMargin;
      return { yr, rev, ebitda, ebit };
    });

    const financialModelData: (string | number | null)[][] = [
      ["INCOME STATEMENT PROJECTIONS"],
      ["Base Year (TTM)", ...projectionYears.map((y) => `Year +${y}`)],
      ["Revenue", bn(currentRevenue), ...projections.map((p) => bn(p.rev))],
      ["Revenue Growth", pct(revenueGrowthRate), ...projections.map(() => pct(revenueGrowthRate))],
      ["Gross Profit", bn(stockData.grossProfits), ...projections.map((p) => bn(p.rev * (stockData.grossMargins ?? 0.5)))],
      ["Gross Margin", pct(stockData.grossMargins), ...projections.map(() => pct(stockData.grossMargins))],
      ["EBITDA", bn(stockData.ebitda), ...projections.map((p) => bn(p.ebitda))],
      ["EBITDA Margin", pct(stockData.ebitdaMargins), ...projections.map(() => pct(stockData.ebitdaMargins))],
      ["EBIT (Operating Income)", bn(currentRevenue * opMargin), ...projections.map((p) => bn(p.ebit))],
      ["Operating Margin", pct(stockData.operatingMargins), ...projections.map(() => pct(stockData.operatingMargins))],
      ["Net Margin", pct(stockData.profitMargins), ...projections.map(() => pct(stockData.profitMargins))],
      [],
      ["BALANCE SHEET SNAPSHOT"],
      ["Total Debt", bn(stockData.totalDebt)],
      ["Total Cash", bn(stockData.totalCash)],
      ["Net Debt", bn((stockData.totalDebt ?? 0) - (stockData.totalCash ?? 0))],
      ["Debt/Equity", fmt(stockData.debtToEquity)],
      ["Current Ratio", fmt(stockData.currentRatio)],
      ["Quick Ratio", fmt(stockData.quickRatio)],
      [],
      ["CASH FLOW"],
      ["Operating Cash Flow", bn(stockData.operatingCashflow)],
      ["Free Cash Flow", bn(stockData.freeCashflow)],
      ["FCF Margin", stockData.freeCashflow != null && currentRevenue > 0
        ? pct(stockData.freeCashflow / currentRevenue)
        : "N/A"],
      [],
      ["RETURN METRICS"],
      ["Return on Equity (ROE)", pct(stockData.returnOnEquity)],
      ["Return on Assets (ROA)", pct(stockData.returnOnAssets)],
      [],
      ["NOTE: Projections use current growth/margin rates as base assumptions."],
      ["Adjust the growth rate and margin inputs for your scenario analysis."],
    ];
    const wsFinancials = XLSX.utils.aoa_to_sheet(financialModelData);
    wsFinancials["!cols"] = [{ wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsFinancials, "Financial Model");

    // ── Sheet 4: DCF Model ─────────────────────────────────────────────────
    const sharesOut = stockData.sharesOutstanding ?? 1;
    const freeCashflow = stockData.freeCashflow ?? 0;
    // Use user-supplied DCF assumptions if provided, else defaults
    const wacc = dcfAssumptions ? dcfAssumptions.wacc / 100 : 0.10;
    const terminalGrowth = dcfAssumptions ? dcfAssumptions.terminalGrowth / 100 : 0.025;
    const fcfGrowthRate = dcfAssumptions
      ? dcfAssumptions.fcfGrowthRate / 100
      : Math.min(revenueGrowthRate, 0.25);

    const dcfRows: (string | number)[][] = [
      ["DCF VALUATION MODEL"],
      [],
      ["ASSUMPTIONS"],
      ["Base FCF (TTM)", bn(freeCashflow)],
      ["FCF Growth Rate (Yr 1-5)", pct(fcfGrowthRate)],
      ["Terminal Growth Rate", pct(terminalGrowth)],
      ["WACC (Discount Rate)", pct(wacc)],
      ["Shares Outstanding", sharesOut != null ? (sharesOut / 1e6).toFixed(1) + "M" : "N/A"],
      [],
      ["PROJECTED FREE CASH FLOWS"],
      ["Year", "FCF", "Discount Factor", "PV of FCF"],
    ];

    let totalPVFCF = 0;
    for (let yr = 1; yr <= 5; yr++) {
      const fcf = freeCashflow * Math.pow(1 + fcfGrowthRate, yr);
      const df = Math.pow(1 + wacc, yr);
      const pv = fcf / df;
      totalPVFCF += pv;
      dcfRows.push([`Year ${yr}`, bn(fcf), `${df.toFixed(3)}x`, bn(pv)]);
    }

    const terminalFCF = freeCashflow * Math.pow(1 + fcfGrowthRate, 5) * (1 + terminalGrowth);
    if (wacc <= terminalGrowth) {
      return NextResponse.json(
        { error: "WACC must be greater than terminal growth rate for a valid DCF." },
        { status: 400 }
      );
    }
    const terminalValue = terminalFCF / (wacc - terminalGrowth);
    const pvTerminal = terminalValue / Math.pow(1 + wacc, 5);
    const totalEnterpriseValue = totalPVFCF + pvTerminal;
    const netDebt = (stockData.totalDebt ?? 0) - (stockData.totalCash ?? 0);
    const equityValue = totalEnterpriseValue - netDebt;
    const impliedSharePrice = sharesOut > 0 ? equityValue / sharesOut : 0;

    dcfRows.push(
      [],
      ["TERMINAL VALUE"],
      ["Terminal Year FCF", bn(terminalFCF)],
      ["Terminal Value (Gordon Growth)", bn(terminalValue)],
      ["PV of Terminal Value", bn(pvTerminal)],
      [],
      ["VALUATION SUMMARY"],
      ["PV of FCFs (Yr 1-5)", bn(totalPVFCF)],
      ["PV of Terminal Value", bn(pvTerminal)],
      ["Enterprise Value", bn(totalEnterpriseValue)],
      ["Less: Net Debt", bn(netDebt)],
      ["Equity Value", bn(equityValue)],
      ["Implied Share Price", impliedSharePrice > 0 ? `$${impliedSharePrice.toFixed(2)}` : "N/A"],
      ["Current Market Price", stockData.regularMarketPrice != null ? `$${stockData.regularMarketPrice.toFixed(2)}` : "N/A"],
      ["Upside / (Downside)",
        stockData.regularMarketPrice != null && impliedSharePrice > 0
          ? `${(((impliedSharePrice - stockData.regularMarketPrice) / stockData.regularMarketPrice) * 100).toFixed(1)}%`
          : "N/A"],
      [],
      ["SENSITIVITY ANALYSIS — Implied Share Price by WACC & Terminal Growth Rate"],
      ["WACC \\ Terminal Growth", "1.5%", "2.0%", "2.5%", "3.0%", "3.5%"],
    );

    const waccRates = [0.08, 0.09, 0.10, 0.11, 0.12];
    const tgRates = [0.015, 0.02, 0.025, 0.03, 0.035];
    for (const w of waccRates) {
      const row: (string | number)[] = [`${(w * 100).toFixed(0)}%`];
      for (const tg of tgRates) {
        if (w <= tg) {
          row.push("N/A");
        } else {
          const tv = (freeCashflow * Math.pow(1 + fcfGrowthRate, 5) * (1 + tg)) / (w - tg);
          const pvTV = tv / Math.pow(1 + w, 5);
          let pvFCFs = 0;
          for (let yr = 1; yr <= 5; yr++) {
            pvFCFs += (freeCashflow * Math.pow(1 + fcfGrowthRate, yr)) / Math.pow(1 + w, yr);
          }
          const ev = pvFCFs + pvTV;
          const eq = ev - netDebt;
          const price = sharesOut > 0 ? eq / sharesOut : 0;
          row.push(price > 0 ? `$${price.toFixed(2)}` : "N/A");
        }
      }
      dcfRows.push(row);
    }

    dcfRows.push([], ["NOTE: This DCF uses TTM FCF as the base. Adjust assumptions in the Assumptions section above."]);

    const wsDCF = XLSX.utils.aoa_to_sheet(dcfRows);
    wsDCF["!cols"] = [{ wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsDCF, "DCF Model");

    // ── Sheet 5: Historical Data ───────────────────────────────────────────
    const yearlyData = stockData.financialsChartYearly ?? [];
    const quarterlyEPS = stockData.earningsChartQuarterly ?? [];

    const histRows: (string | number)[][] = [
      ["HISTORICAL FINANCIALS"],
      [],
    ];

    if (yearlyData.length > 0) {
      histRows.push(["Annual Revenue & Earnings"]);
      histRows.push(["Year", "Revenue", "Earnings"]);
      for (const row of yearlyData) {
        histRows.push([
          row.date ?? "",
          row.revenue != null ? bn(row.revenue) : "N/A",
          row.earnings != null ? bn(row.earnings) : "N/A",
        ]);
      }
      histRows.push([]);
    }

    if (quarterlyEPS.length > 0) {
      histRows.push(["Quarterly EPS (Actual vs Estimate)"]);
      histRows.push(["Quarter", "Actual EPS", "Estimate EPS", "Surprise"]);
      for (const row of quarterlyEPS) {
        const surprise = row.actual != null && row.estimate != null
          ? `${(((row.actual - row.estimate) / Math.abs(row.estimate)) * 100).toFixed(1)}%`
          : "N/A";
        histRows.push([
          row.date ?? "",
          row.actual != null ? `$${row.actual.toFixed(2)}` : "N/A",
          row.estimate != null ? `$${row.estimate.toFixed(2)}` : "N/A",
          surprise,
        ]);
      }
    }

    if (histRows.length > 2) {
      const wsHist = XLSX.utils.aoa_to_sheet(histRows);
      wsHist["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsHist, "Historical Data");
    }

    // ── Sheet 6: Peer Comparables (if provided) ────────────────────────────
    if (peers && peers.length > 0) {
      const peerRows: (string | number | null)[][] = [
        ["PEER COMPARABLES"],
        [],
        ["Company", "Mkt Cap", "Trailing P/E", "Forward P/E", "P/Book", "EV/EBITDA", "Rev Growth", "Gross Margin", "Op Margin", "ROE"],
      ];
      for (const p of peers) {
        peerRows.push([
          `${p.symbol} — ${p.name}`,
          p.marketCap != null ? bn(p.marketCap) : "N/A",
          p.trailingPE != null ? p.trailingPE.toFixed(1) + "x" : "N/A",
          p.forwardPE != null ? p.forwardPE.toFixed(1) + "x" : "N/A",
          p.priceToBook != null ? p.priceToBook.toFixed(2) + "x" : "N/A",
          p.evToEbitda != null ? p.evToEbitda.toFixed(1) + "x" : "N/A",
          p.revenueGrowth != null ? pct(p.revenueGrowth) : "N/A",
          p.grossMargins != null ? pct(p.grossMargins) : "N/A",
          p.operatingMargins != null ? pct(p.operatingMargins) : "N/A",
          p.returnOnEquity != null ? pct(p.returnOnEquity) : "N/A",
        ]);
      }
      const wsPeers = XLSX.utils.aoa_to_sheet(peerRows);
      wsPeers["!cols"] = [
        { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, wsPeers, "Peer Comparables");
    }

    void styleHeader;
    void sections;

    // Write workbook to buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `${stockData.symbol}_pitch_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Excel export error:", err);
    return NextResponse.json({ error: "Failed to generate Excel export" }, { status: 500 });
  }
}

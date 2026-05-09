"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cell,
  Label,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
} from "recharts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Download, GripVertical, X } from "lucide-react";
import ChartExportButton from "@/components/ChartExportButton";
import type { EnrichedPosition, QuoteSummaryData } from "@/lib/types";

const STORAGE_KEY = "gcm-stat-keys";

/** Default metrics shown on first load (users can add/remove/reorder; stored in localStorage). */
const DEFAULT_STAT_KEYS = [
  "marketCap",
  "totalRevenue",
  "impliedNetIncome",
  "grossMargins",
  "operatingMargins",
  "returnOnEquity",
  "debtToEquity",
  "currentRatio",
  "freeCashflow",
  "trailingPE",
  "forwardPE",
  "priceToBook",
  "dividendYield",
  "payoutRatio",
  "enterpriseValue",
  "revenueGrowth",
] as const;

const DONUT_COLORS = [
  "#C9A227",
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
] as const;

/** Donut + legend: at most this many slices; smallest positions roll into "Other". */
const MAX_PIE_SLICES = 8;
const PIE_OTHER_LABEL = "Other";
const PIE_OTHER_FILL = "#64748b";

interface StatDef {
  key: string;
  label: string;
  /** Pull numeric value from summary for weighting; null skips position */
  getValue: (s: QuoteSummaryData | null) => number | null;
  format:
    | "percentAsFraction"
    | "percentAlreadyPct"
    | "currency"
    | "ratio"
    | "perShare"
    | "shares";
}

const STAT_REGISTRY: Record<string, StatDef> = {
  marketCap: {
    key: "marketCap",
    label: "Market Cap",
    getValue: (s) => (s && s.marketCap > 0 ? s.marketCap : null),
    format: "currency",
  },
  enterpriseValue: {
    key: "enterpriseValue",
    label: "Enterprise Value",
    getValue: (s) =>
      s != null && s.enterpriseValue > 0 ? s.enterpriseValue : null,
    format: "currency",
  },
  trailingPE: {
    key: "trailingPE",
    label: "Trailing P/E",
    getValue: (s) =>
      s != null && Number.isFinite(s.trailingPE) && s.trailingPE > 0
        ? s.trailingPE
        : null,
    format: "ratio",
  },
  forwardPE: {
    key: "forwardPE",
    label: "Forward P/E",
    getValue: (s) =>
      s != null && Number.isFinite(s.forwardPE) && s.forwardPE > 0
        ? s.forwardPE
        : null,
    format: "ratio",
  },
  priceToBook: {
    key: "priceToBook",
    label: "P/B",
    getValue: (s) =>
      s != null && Number.isFinite(s.priceToBook) && s.priceToBook > 0
        ? s.priceToBook
        : null,
    format: "ratio",
  },
  priceToSales: {
    key: "priceToSales",
    label: "P/S (TTM)",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.priceToSalesTrailing12Months) &&
      s.priceToSalesTrailing12Months > 0
        ? s.priceToSalesTrailing12Months
        : null,
    format: "ratio",
  },
  evToRevenue: {
    key: "evToRevenue",
    label: "EV / Revenue",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.enterpriseToRevenue) &&
      s.enterpriseToRevenue > 0
        ? s.enterpriseToRevenue
        : null,
    format: "ratio",
  },
  evToEbitda: {
    key: "evToEbitda",
    label: "EV / EBITDA",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.enterpriseToEbitda) &&
      s.enterpriseToEbitda > 0
        ? s.enterpriseToEbitda
        : null,
    format: "ratio",
  },
  pegRatio: {
    key: "pegRatio",
    label: "PEG",
    getValue: (s) =>
      s != null && Number.isFinite(s.pegRatio) && s.pegRatio > 0
        ? s.pegRatio
        : null,
    format: "ratio",
  },
  beta: {
    key: "beta",
    label: "Beta",
    getValue: (s) =>
      s != null && Number.isFinite(s.beta) && s.beta !== 0 ? s.beta : null,
    format: "ratio",
  },
  totalRevenue: {
    key: "totalRevenue",
    label: "Total Revenue (TTM)",
    getValue: (s) => (s != null && s.totalRevenue > 0 ? s.totalRevenue : null),
    format: "currency",
  },
  grossProfits: {
    key: "grossProfits",
    label: "Gross Profit (TTM)",
    getValue: (s) => (s != null && s.grossProfits > 0 ? s.grossProfits : null),
    format: "currency",
  },
  ebitda: {
    key: "ebitda",
    label: "EBITDA (TTM)",
    getValue: (s) => (s != null && s.ebitda > 0 ? s.ebitda : null),
    format: "currency",
  },
  impliedNetIncome: {
    key: "impliedNetIncome",
    label: "Net Income (implied, TTM)",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.profitMargins) &&
      s.profitMargins > 0 &&
      s.totalRevenue > 0
        ? s.profitMargins * s.totalRevenue
        : null,
    format: "currency",
  },
  revenueGrowth: {
    key: "revenueGrowth",
    label: "Revenue Growth (YoY)",
    getValue: (s) =>
      s != null && Number.isFinite(s.revenueGrowth) ? s.revenueGrowth : null,
    format: "percentAsFraction",
  },
  earningsGrowth: {
    key: "earningsGrowth",
    label: "Earnings Growth (YoY)",
    getValue: (s) =>
      s != null && Number.isFinite(s.earningsGrowth) ? s.earningsGrowth : null,
    format: "percentAsFraction",
  },
  revenuePerShare: {
    key: "revenuePerShare",
    label: "Revenue / Share",
    getValue: (s) =>
      s != null && Number.isFinite(s.revenuePerShare) && s.revenuePerShare > 0
        ? s.revenuePerShare
        : null,
    format: "perShare",
  },
  filingCostOfRevenue: {
    key: "filingCostOfRevenue",
    label: "Cost of Revenue (latest filing)",
    getValue: (s) =>
      s != null && s.statementCostOfRevenue > 0
        ? s.statementCostOfRevenue
        : null,
    format: "currency",
  },
  filingOperatingIncome: {
    key: "filingOperatingIncome",
    label: "Operating Income (latest filing)",
    getValue: (s) =>
      s != null && s.statementOperatingIncome !== 0
        ? s.statementOperatingIncome
        : null,
    format: "currency",
  },
  filingNetIncome: {
    key: "filingNetIncome",
    label: "Net Income (latest filing)",
    getValue: (s) =>
      s != null && s.statementNetIncome !== 0 ? s.statementNetIncome : null,
    format: "currency",
  },
  filingInterestExpense: {
    key: "filingInterestExpense",
    label: "Interest Expense (latest filing)",
    getValue: (s) =>
      s != null && s.statementInterestExpense !== 0
        ? s.statementInterestExpense
        : null,
    format: "currency",
  },
  filingRd: {
    key: "filingRd",
    label: "R&D (latest filing)",
    getValue: (s) =>
      s != null && s.statementResearchDevelopment > 0
        ? s.statementResearchDevelopment
        : null,
    format: "currency",
  },
  filingSga: {
    key: "filingSga",
    label: "SG&A (latest filing)",
    getValue: (s) =>
      s != null && s.statementSellingGeneralAdmin > 0
        ? s.statementSellingGeneralAdmin
        : null,
    format: "currency",
  },
  grossMargins: {
    key: "grossMargins",
    label: "Gross Margin",
    getValue: (s) =>
      s != null && Number.isFinite(s.grossMargins) ? s.grossMargins : null,
    format: "percentAsFraction",
  },
  ebitdaMargins: {
    key: "ebitdaMargins",
    label: "EBITDA Margin",
    getValue: (s) =>
      s != null && Number.isFinite(s.ebitdaMargins) ? s.ebitdaMargins : null,
    format: "percentAsFraction",
  },
  operatingMargins: {
    key: "operatingMargins",
    label: "Operating Margin",
    getValue: (s) =>
      s != null && Number.isFinite(s.operatingMargins)
        ? s.operatingMargins
        : null,
    format: "percentAsFraction",
  },
  netProfitMargin: {
    key: "netProfitMargin",
    label: "Net Profit Margin",
    getValue: (s) =>
      s != null && Number.isFinite(s.profitMargins) ? s.profitMargins : null,
    format: "percentAsFraction",
  },
  totalCash: {
    key: "totalCash",
    label: "Total Cash",
    getValue: (s) => (s != null && s.totalCash > 0 ? s.totalCash : null),
    format: "currency",
  },
  totalDebt: {
    key: "totalDebt",
    label: "Total Debt",
    getValue: (s) => (s != null && s.totalDebt > 0 ? s.totalDebt : null),
    format: "currency",
  },
  netLiquidity: {
    key: "netLiquidity",
    label: "Cash - Total Debt",
    getValue: (s) =>
      s != null && (s.totalCash > 0 || s.totalDebt > 0)
        ? s.totalCash - s.totalDebt
        : null,
    format: "currency",
  },
  filingTotalAssets: {
    key: "filingTotalAssets",
    label: "Total Assets (latest filing)",
    getValue: (s) =>
      s != null && s.statementTotalAssets > 0 ? s.statementTotalAssets : null,
    format: "currency",
  },
  filingTotalLiabilities: {
    key: "filingTotalLiabilities",
    label: "Total Liabilities (latest filing)",
    getValue: (s) =>
      s != null && s.statementTotalLiabilities > 0
        ? s.statementTotalLiabilities
        : null,
    format: "currency",
  },
  filingStockholderEquity: {
    key: "filingStockholderEquity",
    label: "Shareholders Equity (latest filing)",
    getValue: (s) =>
      s != null && s.statementStockholderEquity !== 0
        ? s.statementStockholderEquity
        : null,
    format: "currency",
  },
  bookEquity: {
    key: "bookEquity",
    label: "Book Equity (BV x shares)",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.bookValue) &&
      s.bookValue > 0 &&
      s.sharesOutstanding > 0
        ? s.bookValue * s.sharesOutstanding
        : null,
    format: "currency",
  },
  debtToEquity: {
    key: "debtToEquity",
    label: "Debt / Equity",
    getValue: (s) =>
      s != null && Number.isFinite(s.debtToEquity) && s.debtToEquity >= 0
        ? s.debtToEquity
        : null,
    format: "ratio",
  },
  currentRatio: {
    key: "currentRatio",
    label: "Current Ratio",
    getValue: (s) =>
      s != null && Number.isFinite(s.currentRatio) && s.currentRatio > 0
        ? s.currentRatio
        : null,
    format: "ratio",
  },
  quickRatio: {
    key: "quickRatio",
    label: "Quick Ratio",
    getValue: (s) =>
      s != null && Number.isFinite(s.quickRatio) && s.quickRatio > 0
        ? s.quickRatio
        : null,
    format: "ratio",
  },
  totalCashPerShare: {
    key: "totalCashPerShare",
    label: "Cash / Share",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.totalCashPerShare) &&
      s.totalCashPerShare > 0
        ? s.totalCashPerShare
        : null,
    format: "perShare",
  },
  operatingCashflow: {
    key: "operatingCashflow",
    label: "Operating Cash Flow (TTM)",
    getValue: (s) =>
      s != null && s.operatingCashflow !== 0 ? s.operatingCashflow : null,
    format: "currency",
  },
  freeCashflow: {
    key: "freeCashflow",
    label: "Free Cash Flow (TTM)",
    getValue: (s) =>
      s != null && s.freeCashflow !== 0 ? s.freeCashflow : null,
    format: "currency",
  },
  filingCapex: {
    key: "filingCapex",
    label: "CapEx (latest filing)",
    getValue: (s) =>
      s != null && s.statementCapitalExpenditures !== 0
        ? s.statementCapitalExpenditures
        : null,
    format: "currency",
  },
  filingDividendsPaid: {
    key: "filingDividendsPaid",
    label: "Dividends Paid (latest filing)",
    getValue: (s) =>
      s != null && s.statementDividendsPaid !== 0
        ? s.statementDividendsPaid
        : null,
    format: "currency",
  },
  returnOnAssets: {
    key: "returnOnAssets",
    label: "Return on Assets",
    getValue: (s) =>
      s != null && Number.isFinite(s.returnOnAssets) ? s.returnOnAssets : null,
    format: "percentAsFraction",
  },
  returnOnEquity: {
    key: "returnOnEquity",
    label: "Return on Equity",
    getValue: (s) =>
      s != null && Number.isFinite(s.returnOnEquity) ? s.returnOnEquity : null,
    format: "percentAsFraction",
  },
  assetTurnover: {
    key: "assetTurnover",
    label: "Asset Turnover (rev / assets)",
    getValue: (s) =>
      s != null &&
      s.totalRevenue > 0 &&
      s.statementTotalAssets > 0 &&
      Number.isFinite(s.totalRevenue / s.statementTotalAssets)
        ? s.totalRevenue / s.statementTotalAssets
        : null,
    format: "ratio",
  },
  dividendYield: {
    key: "dividendYield",
    label: "Dividend Yield",
    getValue: (s) =>
      s != null && Number.isFinite(s.dividendYield) && s.dividendYield > 0
        ? s.dividendYield
        : null,
    format: "percentAsFraction",
  },
  dividendRate: {
    key: "dividendRate",
    label: "Annual Dividend ($/sh)",
    getValue: (s) =>
      s != null && Number.isFinite(s.dividendRate) && s.dividendRate > 0
        ? s.dividendRate
        : null,
    format: "perShare",
  },
  payoutRatio: {
    key: "payoutRatio",
    label: "Payout Ratio",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.payoutRatio) &&
      s.payoutRatio > 0 &&
      s.payoutRatio < 10
        ? s.payoutRatio
        : null,
    format: "percentAsFraction",
  },
  fiveYearAvgDividendYield: {
    key: "fiveYearAvgDividendYield",
    label: "5Y Avg Dividend Yield",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.fiveYearAvgDividendYield) &&
      s.fiveYearAvgDividendYield > 0
        ? s.fiveYearAvgDividendYield
        : null,
    format: "percentAlreadyPct",
  },
  trailingAnnualDividendRate: {
    key: "trailingAnnualDividendRate",
    label: "Trailing Div. Rate ($/sh)",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.trailingAnnualDividendRate) &&
      s.trailingAnnualDividendRate > 0
        ? s.trailingAnnualDividendRate
        : null,
    format: "perShare",
  },
  trailingAnnualDividendYield: {
    key: "trailingAnnualDividendYield",
    label: "Trailing Dividend Yield",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.trailingAnnualDividendYield) &&
      s.trailingAnnualDividendYield > 0
        ? s.trailingAnnualDividendYield
        : null,
    format: "percentAsFraction",
  },
  sharesOutstanding: {
    key: "sharesOutstanding",
    label: "Shares Outstanding",
    getValue: (s) =>
      s != null && s.sharesOutstanding > 0 ? s.sharesOutstanding : null,
    format: "shares",
  },
  floatShares: {
    key: "floatShares",
    label: "Float",
    getValue: (s) => (s != null && s.floatShares > 0 ? s.floatShares : null),
    format: "shares",
  },
  shortRatio: {
    key: "shortRatio",
    label: "Short Ratio",
    getValue: (s) =>
      s != null && Number.isFinite(s.shortRatio) && s.shortRatio > 0
        ? s.shortRatio
        : null,
    format: "ratio",
  },
  heldPercentInsiders: {
    key: "heldPercentInsiders",
    label: "Insider Ownership",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.heldPercentInsiders) &&
      s.heldPercentInsiders > 0
        ? s.heldPercentInsiders
        : null,
    format: "percentAsFraction",
  },
  heldPercentInstitutions: {
    key: "heldPercentInstitutions",
    label: "Institutional Ownership",
    getValue: (s) =>
      s != null &&
      Number.isFinite(s.heldPercentInstitutions) &&
      s.heldPercentInstitutions > 0
        ? s.heldPercentInstitutions
        : null,
    format: "percentAsFraction",
  },
  trailingEps: {
    key: "trailingEps",
    label: "EPS (TTM)",
    getValue: (s) =>
      s != null && Number.isFinite(s.trailingEps) && s.trailingEps !== 0
        ? s.trailingEps
        : null,
    format: "perShare",
  },
  forwardEps: {
    key: "forwardEps",
    label: "EPS (forward)",
    getValue: (s) =>
      s != null && Number.isFinite(s.forwardEps) && s.forwardEps > 0
        ? s.forwardEps
        : null,
    format: "perShare",
  },
  bookValue: {
    key: "bookValue",
    label: "Book Value / Share",
    getValue: (s) =>
      s != null && Number.isFinite(s.bookValue) && s.bookValue > 0
        ? s.bookValue
        : null,
    format: "perShare",
  },
  /** @deprecated Use `operatingMargins` — kept for older saved metric lists */
  operatingMargin: {
    key: "operatingMargin",
    label: "Operating Margin",
    getValue: (s) =>
      s != null && Number.isFinite(s.operatingMargins)
        ? s.operatingMargins
        : null,
    format: "percentAsFraction",
  },
  /** @deprecated Use `enterpriseValue` — kept for older saved metric lists */
  totalEnterpriseValue: {
    key: "totalEnterpriseValue",
    label: "Enterprise Value",
    getValue: (s) =>
      s != null && s.enterpriseValue > 0 ? s.enterpriseValue : null,
    format: "currency",
  },
};

/** Searchable stat metric rows (keys user can add). */
export const PORTFOLIO_STATS_SEARCHABLE = Object.values(STAT_REGISTRY).sort(
  (a, b) => a.label.localeCompare(b.label)
);

function loadStatKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return [...DEFAULT_STAT_KEYS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_STAT_KEYS];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "string") continue;
      if (!STAT_REGISTRY[entry] || seen.has(entry)) continue;
      seen.add(entry);
      out.push(entry);
    }
    return out.length > 0 ? out : [...DEFAULT_STAT_KEYS];
  } catch {
    return [...DEFAULT_STAT_KEYS];
  }
}

function persistStatKeys(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1e9 ? 2 : 0,
    minimumFractionDigits: 0,
  });
}

function fmtStatValue(def: StatDef, weighted: number): string {
  switch (def.format) {
    case "percentAsFraction":
      return `${(weighted * 100).toFixed(2)}%`;
    case "percentAlreadyPct":
      return `${weighted.toFixed(2)}%`;
    case "currency":
      return fmtCurrency(weighted);
    case "ratio":
      return weighted.toFixed(2);
    case "perShare":
      return `$${weighted.toFixed(2)}`;
    case "shares":
      return weighted.toLocaleString(undefined, {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      });
    default:
      return String(weighted);
  }
}

type PieSlice = {
  name: string;
  value: number;
  /** When name is Other: how many tickers are merged into this slice */
  groupedCount?: number;
};

/** Keeps the largest positions by market value; merges the rest into {@link PIE_OTHER_LABEL}. */
function groupSmallestAsOther(
  rows: PieSlice[],
  maxSlices: number
): PieSlice[] {
  const clean = rows.filter((r) => r.value > 0);
  if (clean.length <= maxSlices) return clean;
  const sorted = [...clean].sort((a, b) => b.value - a.value);
  const headLen = maxSlices - 1;
  const head = sorted.slice(0, headLen).map(({ name, value }) => ({ name, value }));
  const tail = sorted.slice(headLen);
  const otherValue = tail.reduce((s, r) => s + r.value, 0);
  if (otherValue <= 0) return head;
  return [
    ...head,
    {
      name: PIE_OTHER_LABEL,
      value: otherValue,
      groupedCount: tail.length,
    },
  ];
}

function pieSliceFill(slice: PieSlice, index: number): string {
  if (slice.name === PIE_OTHER_LABEL) return PIE_OTHER_FILL;
  return DONUT_COLORS[index % DONUT_COLORS.length];
}

/** Center of donut (dark hole) — avoids low-contrast text on colored arcs. */
function HoldingsDonutCenter({
  cx,
  cy,
  pieData,
  totalMv,
  holdingCount,
}: {
  cx: number;
  cy: number;
  pieData: PieSlice[];
  totalMv: number;
  /** Distinct positions with MV &gt; 0 (not slice count; avoids "7 positions" when chart is grouped). */
  holdingCount: number;
}) {
  if (pieData.length === 0) return null;

  if (pieData.length === 1) {
    const d = pieData[0];
    const pct = totalMv > 0 ? (d.value / totalMv) * 100 : 100;
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "var(--color-foreground, #f4f4f5)" }}
      >
        <tspan x={cx} dy={-5} style={{ fontSize: 14, fontWeight: 600 }}>
          {d.name}
        </tspan>
        <tspan
          x={cx}
          dy={20}
          style={{ fontSize: 11, fill: "var(--color-muted, #9AA3AF)" }}
        >
          {pct.toFixed(1)}% of portfolio
        </tspan>
      </text>
    );
  }

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      <tspan
        x={cx}
        dy={-5}
        style={{ fontSize: 13, fontWeight: 600, fill: "var(--color-foreground, #f4f4f5)" }}
      >
        {fmtCurrency(totalMv)}
      </tspan>
      <tspan
        x={cx}
        dy={19}
        style={{ fontSize: 10, fill: "var(--color-muted, #9AA3AF)" }}
      >
        {holdingCount} positions
      </tspan>
    </text>
  );
}

function centerLabelFromViewBox(
  viewBox: unknown
): { cx: number; cy: number } {
  if (!viewBox || typeof viewBox !== "object") return { cx: 0, cy: 0 };
  const v = viewBox as Record<string, unknown>;
  const cx = typeof v.cx === "number" ? v.cx : 0;
  const cy = typeof v.cy === "number" ? v.cy : 0;
  return { cx, cy };
}

function SortableStatRow({
  statKey,
  label,
  valueDisplay,
  onRemove,
}: {
  statKey: string;
  label: string;
  valueDisplay: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: statKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 border-b border-border/50 py-1.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing rounded p-1 text-muted hover:text-foreground touch-none shrink-0"
        aria-label="Reorder stat"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 text-[12px] text-muted truncate">
        {label}
      </span>
      <span className="text-[13px] font-medium text-foreground tabular-nums shrink-0">
        {valueDisplay}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-muted hover:text-foreground hover:bg-card transition-colors shrink-0"
        aria-label={`Remove ${label}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface PortfolioStatsProps {
  positions: EnrichedPosition[];
}

export default function PortfolioStats({ positions }: PortfolioStatsProps) {
  const [statKeys, setStatKeys] = useState<string[]>(() => [...DEFAULT_STAT_KEYS]);
  const [query, setQuery] = useState("");
  const [summaries, setSummaries] = useState<
    Record<string, QuoteSummaryData | null>
  >({});
  const [loading, setLoading] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatKeys(loadStatKeys());
  }, []);

  const fetchSummaries = useCallback(async () => {
    if (positions.length === 0) {
      setSummaries({});
      return;
    }
    setLoading(true);
    try {
      const entries = await Promise.all(
        positions.map(async (p) => {
          try {
            const res = await fetch(
              `/api/stocks?action=summary&symbol=${encodeURIComponent(p.symbol)}`,
              { credentials: "include" }
            );
            if (!res.ok) return [p.symbol, null] as const;
            const data = (await res.json()) as QuoteSummaryData;
            return [p.symbol, data] as const;
          } catch {
            return [p.symbol, null] as const;
          }
        })
      );
      setSummaries(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }, [positions]);

  useEffect(() => {
    void fetchSummaries();
  }, [fetchSummaries]);

  const totalMv = useMemo(
    () => positions.reduce((s, p) => s + (p.marketValue > 0 ? p.marketValue : 0), 0),
    [positions]
  );

  const holdingCount = useMemo(
    () => positions.filter((p) => p.marketValue > 0).length,
    [positions]
  );

  const pieData = useMemo(() => {
    if (totalMv <= 0) return [];
    const raw: PieSlice[] = positions
      .filter((p) => p.marketValue > 0)
      .map((p) => ({
        name: p.symbol,
        value: p.marketValue,
      }));
    return groupSmallestAsOther(raw, MAX_PIE_SLICES);
  }, [positions, totalMv]);

  const filteredSearch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PORTFOLIO_STATS_SEARCHABLE;
    return PORTFOLIO_STATS_SEARCHABLE.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)
    );
  }, [query]);

  function addStatKey(key: string) {
    if (!STAT_REGISTRY[key]) return;
    setStatKeys((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      persistStatKeys(next);
      return next;
    });
    setQuery("");
  }

  function removeStatKey(key: string) {
    setStatKeys((prev) => {
      const next = prev.filter((k) => k !== key);
      persistStatKeys(next);
      return next;
    });
  }

  function weightedValue(statKey: string): number | null {
    const def = STAT_REGISTRY[statKey];
    if (!def || totalMv <= 0) return null;
    let sum = 0;
    let covered = 0;
    for (const p of positions) {
      const w = p.marketValue;
      if (w <= 0) continue;
      const s = summaries[p.symbol] ?? null;
      const v = def.getValue(s);
      if (v == null || !Number.isFinite(v)) continue;
      sum += v * w;
      covered += w;
    }
    if (covered <= 0) return null;
    return sum / covered;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStatKeys((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      persistStatKeys(next);
      return next;
    });
  }

  const ghostBtn =
    "inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-card hover:text-foreground";

  if (positions.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 min-w-0">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="relative flex flex-col gap-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search metrics (revenue, P/E, margins, cash flow…)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                aria-label="Search statistics to add"
              />
              {query.trim() && filteredSearch.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg">
                  {filteredSearch.map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-[12px] text-foreground hover:bg-card-hover transition-colors"
                        onClick={() => addStatKey(s.key)}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* TODO: portfolio stats CSV/PDF export */}
            <button
              type="button"
              className={ghostBtn}
              title="Export coming soon"
              onClick={() => {
                /* TODO: portfolio stats export */
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          {loading && (
            <p className="text-[12px] text-muted">Loading fundamentals…</p>
          )}
          {!loading && (
            <p className="text-[11px] leading-snug text-muted">
              Portfolio-weighted averages by market value (each holding with data
              counts in proportion to its weight). Statement lines use the latest
              annual period when available, otherwise the latest quarter; Yahoo
              sometimes omits these modules.
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={statKeys}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-w-0">
                {statKeys.map((key) => {
                  const def = STAT_REGISTRY[key];
                  if (!def) return null;
                  const w = weightedValue(key);
                  const display =
                    w != null && Number.isFinite(w)
                      ? fmtStatValue(def, w)
                      : "—";
                  return (
                    <SortableStatRow
                      key={key}
                      statKey={key}
                      label={def.label}
                      valueDisplay={display}
                      onRemove={() => removeStatKey(key)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <h3 className="text-[11px] uppercase tracking-wider text-muted">
            Portfolio Holdings
          </h3>
          <div
            ref={chartRef}
            className="relative flex min-h-[220px] w-full min-w-0 items-center justify-center rounded-xl border border-border bg-card/40 px-2 py-4 [&_.recharts-layer]:outline-none"
          >
            <ChartExportButton
              chartRef={chartRef}
              filename="portfolio-holdings-allocation"
              title="Portfolio Holdings"
            />
            {pieData.length === 0 ? (
              <p className="text-[12px] text-muted">No allocation data</p>
            ) : (
              <div className="flex w-full min-w-0 flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={220} minWidth={0}>
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      label={false}
                      isAnimationActive={false}
                    >
                      <Label
                        position="center"
                        content={(labelProps) => {
                          const { cx, cy } = centerLabelFromViewBox(
                            labelProps.viewBox
                          );
                          return (
                            <HoldingsDonutCenter
                              cx={cx}
                              cy={cy}
                              pieData={pieData}
                              totalMv={totalMv}
                              holdingCount={holdingCount}
                            />
                          );
                        }}
                      />
                      {pieData.map((slice, index) => (
                        <Cell
                          key={`slice-${slice.name}-${index}`}
                          fill={pieSliceFill(slice, index)}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
                {pieData.length > 1 ? (
                  <ul
                    className="flex max-w-full flex-wrap justify-center gap-x-5 gap-y-2 px-1 text-[11px]"
                    aria-label="Holdings breakdown"
                  >
                    {pieData.map((d, index) => {
                      const pct =
                        totalMv > 0 ? (d.value / totalMv) * 100 : 0;
                      const fill = pieSliceFill(d, index);
                      const isOther = d.name === PIE_OTHER_LABEL;
                      return (
                        <li
                          key={`${d.name}-${index}`}
                          className="flex items-center gap-2 text-left"
                          title={
                            isOther && d.groupedCount
                              ? `${d.groupedCount} smallest positions by weight`
                              : undefined
                          }
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: fill }}
                            aria-hidden
                          />
                          <span className="font-medium text-foreground">
                            {d.name}
                            {isOther && d.groupedCount ? (
                              <span className="ml-1 font-normal text-muted">
                                {" "}
                                ({d.groupedCount})
                              </span>
                            ) : null}
                          </span>
                          <span className="tabular-nums text-muted">
                            {pct.toFixed(1)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

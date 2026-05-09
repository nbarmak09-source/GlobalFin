import type { QuoteSummaryData, PortfolioFundamentals } from "./types";

export interface MetricDef {
  label: string
  key: string
  source: 'income' | 'balance' | 'cashflow' | 'metrics'
  format: 'currency' | 'percent' | 'ratio' | 'number'
  description: string
}

export const METRICS: MetricDef[] = [
  // ── Income Statement ──────────────────────────────────────────────────────
  { label: 'Revenue',                key: 'revenue',                        source: 'income',   format: 'currency', description: 'Total net revenue' },
  { label: 'Gross Profit',           key: 'grossProfit',                    source: 'income',   format: 'currency', description: 'Revenue minus cost of goods sold' },
  { label: 'Gross Profit Margin',    key: 'grossProfitRatio',               source: 'income',   format: 'percent',  description: 'Gross profit as % of revenue' },
  { label: 'Operating Income',       key: 'operatingIncome',                source: 'income',   format: 'currency', description: 'EBIT — earnings before interest and tax' },
  { label: 'Operating Margin',       key: 'operatingIncomeRatio',           source: 'income',   format: 'percent',  description: 'Operating income as % of revenue' },
  { label: 'EBITDA',                 key: 'ebitda',                         source: 'income',   format: 'currency', description: 'Earnings before interest, tax, depreciation & amortisation' },
  { label: 'EBITDA Margin',          key: 'ebitdaratio',                    source: 'income',   format: 'percent',  description: 'EBITDA as % of revenue' },
  { label: 'Net Income',             key: 'netIncome',                      source: 'income',   format: 'currency', description: 'Bottom-line profit after all expenses and taxes' },
  { label: 'Net Profit Margin',      key: 'netIncomeRatio',                 source: 'income',   format: 'percent',  description: 'Net income as % of revenue' },
  { label: 'R&D Expenses',           key: 'researchAndDevelopmentExpenses', source: 'income',   format: 'currency', description: 'Research and development spend' },
  { label: 'EPS (Diluted)',          key: 'epsdiluted',                     source: 'income',   format: 'ratio',    description: 'Earnings per diluted share' },
  { label: 'Interest Expense',       key: 'interestExpense',                source: 'income',   format: 'currency', description: 'Cost of debt service' },
  { label: 'Income Tax',             key: 'incomeTaxExpense',               source: 'income',   format: 'currency', description: 'Total income tax expense' },

  // ── Balance Sheet ─────────────────────────────────────────────────────────
  { label: 'Total Assets',           key: 'totalAssets',                    source: 'balance',  format: 'currency', description: 'Sum of all assets' },
  { label: 'Total Equity',           key: 'totalStockholdersEquity',        source: 'balance',  format: 'currency', description: 'Book value of shareholders equity' },
  { label: 'Total Debt',             key: 'totalDebt',                      source: 'balance',  format: 'currency', description: 'Short + long-term debt' },
  { label: 'Cash & Equivalents',     key: 'cashAndCashEquivalents',         source: 'balance',  format: 'currency', description: 'Liquid cash on hand' },
  { label: 'Net Cash',               key: 'netCash',                        source: 'balance',  format: 'currency', description: 'Cash minus total debt' },

  // ── Cash Flow ─────────────────────────────────────────────────────────────
  { label: 'Operating Cash Flow',    key: 'operatingCashFlow',              source: 'cashflow', format: 'currency', description: 'Cash generated from core operations' },
  { label: 'Free Cash Flow',         key: 'freeCashFlow',                   source: 'cashflow', format: 'currency', description: 'Operating cash flow minus capex' },
  { label: 'Capex',                  key: 'capitalExpenditure',             source: 'cashflow', format: 'currency', description: 'Capital expenditure' },
  { label: 'Dividends Paid',         key: 'dividendsPaid',                  source: 'cashflow', format: 'currency', description: 'Dividends paid to shareholders' },
  { label: 'Share Buybacks',         key: 'commonStockRepurchased',         source: 'cashflow', format: 'currency', description: 'Cash spent on share repurchases' },

  // ── Key Metrics ───────────────────────────────────────────────────────────
  { label: 'P/E Ratio',              key: 'peRatio',                        source: 'metrics',  format: 'ratio',    description: 'Price-to-earnings ratio' },
  { label: 'P/B Ratio',              key: 'pbRatio',                        source: 'metrics',  format: 'ratio',    description: 'Price-to-book ratio' },
  { label: 'EV/EBITDA',              key: 'evToEbitda',                     source: 'metrics',  format: 'ratio',    description: 'Enterprise value to EBITDA' },
  { label: 'EV/Sales',               key: 'evToSales',                      source: 'metrics',  format: 'ratio',    description: 'Enterprise value to revenue' },
  { label: 'Return on Equity',       key: 'roe',                            source: 'metrics',  format: 'percent',  description: 'Net income divided by shareholders equity' },
  { label: 'Return on Assets',       key: 'roa',                            source: 'metrics',  format: 'percent',  description: 'Net income divided by total assets' },
  { label: 'Return on Capital',      key: 'roic',                           source: 'metrics',  format: 'percent',  description: 'Return on invested capital' },
  { label: 'Debt / Equity',          key: 'debtToEquity',                   source: 'metrics',  format: 'ratio',    description: 'Financial leverage ratio' },
  { label: 'Current Ratio',          key: 'currentRatio',                   source: 'metrics',  format: 'ratio',    description: 'Liquidity: current assets / current liabilities' },
  { label: 'Quick Ratio',            key: 'quickRatio',                     source: 'metrics',  format: 'ratio',    description: 'Liquidity ex. inventory' },
  { label: 'Forward P/E',            key: 'forwardPE',                    source: 'metrics',  format: 'ratio',    description: 'Price to forward earnings' },
  { label: 'PEG Ratio',              key: 'pegRatio',                       source: 'metrics',  format: 'ratio',    description: 'P/E to growth' },
  { label: 'Price / Sales',          key: 'priceToSales',                   source: 'metrics',  format: 'ratio',    description: 'Market cap to revenue (TTM)' },
  { label: 'Dividend Yield',         key: 'dividendYield',                  source: 'metrics',  format: 'percent',  description: 'Annual dividend as % of share price' },
  { label: 'Market Cap',             key: 'marketCap',                      source: 'metrics',  format: 'currency', description: 'Total market capitalisation' },
]

export const getMetric = (key: string) => METRICS.find(m => m.key === key)

// ── Portfolio / watchlist table columns (preference picker) ────────────────

/** Keys used by `PortfolioTable` / `WatchlistTable` column picker (`gcm-column-prefs`). */
export interface AvailableTableMetric {
  key: string
  label: string
  defaultVisible: boolean
}

/** Core portfolio / watchlist columns (shown first in picker). */
const PORTFOLIO_TABLE_BASE_METRICS: AvailableTableMetric[] = [
  { key: 'ticker', label: 'Ticker', defaultVisible: true },
  { key: 'shares', label: 'Shares', defaultVisible: false },
  { key: 'avgCost', label: 'Avg. Cost Basis', defaultVisible: false },
  { key: 'marketValue', label: 'Market Value', defaultVisible: false },
  { key: 'totalPLPercent', label: '% Chg.', defaultVisible: false },
  { key: 'percentPortfolio', label: '% of Portfolio', defaultVisible: false },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'price', label: 'Stock Price', defaultVisible: true },
  { key: 'change', label: 'Daily $ Chg.', defaultVisible: true },
  { key: 'changePercent', label: 'Daily % Chg.', defaultVisible: false },
  { key: 'marketCap', label: 'Mkt cap', defaultVisible: false },
  { key: 'pe', label: 'P/E', defaultVisible: false },
  { key: 'volume', label: 'Volume', defaultVisible: false },
  { key: 'ytdReturn', label: 'YTD %', defaultVisible: false },
  { key: 'week52High', label: '52W high', defaultVisible: false },
  { key: 'week52Low', label: '52W low', defaultVisible: false },
  { key: 'sector', label: 'Sector', defaultVisible: false },
  { key: 'totalPL', label: 'Total P&L', defaultVisible: false },
]

const BASE_METRIC_KEY_SET = new Set(PORTFOLIO_TABLE_BASE_METRICS.map((m) => m.key))

/** Non-removable holdings columns, matching the fixed setup in the portfolio table. */
export const FIXED_PORTFOLIO_TABLE_METRIC_KEYS = [
  "ticker",
  "shares",
  "avgCost",
  "price",
  "marketValue",
  "totalPLPercent",
  "percentPortfolio",
] as const;

export const FIXED_PORTFOLIO_TABLE_METRIC_KEY_SET = new Set<string>(
  FIXED_PORTFOLIO_TABLE_METRIC_KEYS
);

/**
 * All columns available in the portfolio / watchlist picker: tape cols + income / balance / CF / ratios from quote summary.
 * Skips `peRatio` (duplicate of column `pe`).
 */
export const AVAILABLE_METRICS: AvailableTableMetric[] = [
  ...PORTFOLIO_TABLE_BASE_METRICS,
  ...METRICS.filter(
    (m) => !BASE_METRIC_KEY_SET.has(m.key) && m.key !== "peRatio"
  ).map((m) => ({
    key: m.key,
    label: m.label,
    defaultVisible: false,
  })),
]

export const AVAILABLE_METRIC_KEY_SET = new Set(AVAILABLE_METRICS.map((m) => m.key))

export function tableMetricLabel(key: string): string {
  return (
    AVAILABLE_METRICS.find((m) => m.key === key)?.label ??
    getMetric(key)?.label ??
    key
  );
}

/** Ordered keys that are visible by default (no localStorage yet). */
export function defaultPortfolioWatchlistVisibleKeys(): string[] {
  return AVAILABLE_METRICS.filter((m) => m.defaultVisible).map((m) => m.key)
}

export const metricsBySource = () =>
  METRICS.reduce<Record<string, MetricDef[]>>((acc, m) => {
    const group = m.source.charAt(0).toUpperCase() + m.source.slice(1)
    ;(acc[group] ??= []).push(m)
    return acc
  }, {})

/** Map Yahoo quote summary into METRICS-shaped keys for portfolio/watchlist columns. */
export function fundamentalsFromQuoteSummary(
  s: QuoteSummaryData | null
): PortfolioFundamentals | undefined {
  if (!s) return undefined;

  const o: PortfolioFundamentals = {};
  const set = (key: string, v: number | undefined | null) => {
    if (v == null || typeof v !== "number" || !Number.isFinite(v)) return;
    o[key] = v;
  };

  set("revenue", s.totalRevenue > 0 ? s.totalRevenue : undefined);
  set("grossProfit", s.grossProfits > 0 ? s.grossProfits : undefined);
  if (Number.isFinite(s.grossMargins)) set("grossProfitRatio", s.grossMargins);

  let operatingIncome: number | undefined;
  if (s.statementOperatingIncome !== 0)
    operatingIncome = s.statementOperatingIncome;
  else if (s.operatingMargins > 0 && s.totalRevenue > 0)
    operatingIncome = s.operatingMargins * s.totalRevenue;
  set("operatingIncome", operatingIncome);

  if (Number.isFinite(s.operatingMargins)) set("operatingIncomeRatio", s.operatingMargins);

  set("ebitda", s.ebitda > 0 ? s.ebitda : undefined);
  if (Number.isFinite(s.ebitdaMargins)) set("ebitdaratio", s.ebitdaMargins);

  let netIncome: number | undefined;
  if (s.statementNetIncome !== 0) netIncome = s.statementNetIncome;
  else if (s.profitMargins > 0 && s.totalRevenue > 0)
    netIncome = s.profitMargins * s.totalRevenue;
  set("netIncome", netIncome);

  if (Number.isFinite(s.profitMargins)) set("netIncomeRatio", s.profitMargins);

  set(
    "researchAndDevelopmentExpenses",
    s.statementResearchDevelopment > 0 ? s.statementResearchDevelopment : undefined
  );

  if (Number.isFinite(s.trailingEps) && s.trailingEps !== 0)
    set("epsdiluted", s.trailingEps);

  if (s.statementInterestExpense !== 0)
    set("interestExpense", Math.abs(s.statementInterestExpense));

  set("totalAssets", s.statementTotalAssets > 0 ? s.statementTotalAssets : undefined);
  set(
    "totalStockholdersEquity",
    s.statementStockholderEquity !== 0 ? s.statementStockholderEquity : undefined
  );
  set("totalDebt", s.totalDebt > 0 ? s.totalDebt : undefined);
  set("cashAndCashEquivalents", s.totalCash > 0 ? s.totalCash : undefined);
  if (s.totalCash > 0 || s.totalDebt > 0) set("netCash", s.totalCash - s.totalDebt);

  set(
    "operatingCashFlow",
    s.operatingCashflow !== 0 ? s.operatingCashflow : undefined
  );
  set("freeCashFlow", s.freeCashflow !== 0 ? s.freeCashflow : undefined);
  set(
    "capitalExpenditure",
    s.statementCapitalExpenditures !== 0 ? s.statementCapitalExpenditures : undefined
  );
  set(
    "dividendsPaid",
    s.statementDividendsPaid !== 0 ? s.statementDividendsPaid : undefined
  );

  set("peRatio", s.trailingPE > 0 ? s.trailingPE : undefined);
  set("pbRatio", s.priceToBook > 0 ? s.priceToBook : undefined);
  set("evToEbitda", s.enterpriseToEbitda > 0 ? s.enterpriseToEbitda : undefined);
  set("evToSales", s.enterpriseToRevenue > 0 ? s.enterpriseToRevenue : undefined);
  if (Number.isFinite(s.returnOnEquity)) set("roe", s.returnOnEquity);
  if (Number.isFinite(s.returnOnAssets)) set("roa", s.returnOnAssets);
  if (Number.isFinite(s.debtToEquity) && s.debtToEquity >= 0)
    set("debtToEquity", s.debtToEquity);
  set("currentRatio", s.currentRatio > 0 ? s.currentRatio : undefined);
  set("quickRatio", s.quickRatio > 0 ? s.quickRatio : undefined);
  set("forwardPE", s.forwardPE > 0 ? s.forwardPE : undefined);
  set("pegRatio", s.pegRatio > 0 ? s.pegRatio : undefined);
  set(
    "priceToSales",
    s.priceToSalesTrailing12Months > 0 ? s.priceToSalesTrailing12Months : undefined
  );
  set("dividendYield", s.dividendYield > 0 ? s.dividendYield : undefined);
  set("marketCap", s.marketCap > 0 ? s.marketCap : undefined);

  return Object.keys(o).length > 0 ? o : undefined;
}

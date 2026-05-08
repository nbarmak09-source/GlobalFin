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

/** Full metric list shown in column picker (order preserved for defaults). */
export const AVAILABLE_METRICS: AvailableTableMetric[] = [
  { key: 'ticker', label: 'Ticker', defaultVisible: true },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'price', label: 'Price', defaultVisible: true },
  { key: 'change', label: 'Change', defaultVisible: true },
  { key: 'changePercent', label: 'Change %', defaultVisible: false },
  { key: 'marketCap', label: 'Mkt cap', defaultVisible: false },
  { key: 'pe', label: 'P/E', defaultVisible: false },
  { key: 'volume', label: 'Volume', defaultVisible: false },
  { key: 'ytdReturn', label: 'YTD %', defaultVisible: false },
  { key: 'week52High', label: '52W high', defaultVisible: false },
  { key: 'week52Low', label: '52W low', defaultVisible: false },
  { key: 'sector', label: 'Sector', defaultVisible: false },
  { key: 'shares', label: 'Shares', defaultVisible: false },
  { key: 'avgCost', label: 'Avg cost', defaultVisible: false },
  { key: 'marketValue', label: 'Mkt value', defaultVisible: false },
  { key: 'totalPL', label: 'Total P&L', defaultVisible: false },
]

export const AVAILABLE_METRIC_KEY_SET = new Set(AVAILABLE_METRICS.map((m) => m.key))

export function tableMetricLabel(key: string): string {
  return AVAILABLE_METRICS.find((m) => m.key === key)?.label ?? key
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

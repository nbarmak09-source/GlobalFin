export interface StockQuote {
  symbol: string;
  /** Yahoo Finance exchange code (e.g. NMS, NYQ); used for TradingView routing */
  exchange?: string;
  /** Yahoo `fullExchangeName` / quoteSummary `exchangeName`; fallback for TradingView routing */
  exchangeName?: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  trailingPE: number;
  currency: string;
}

export interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  priceUSD: number;
  changeUSD: number;
}

export interface NewsArticle {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  thumbnail: string;
  summary: string;
}

/** Named portfolio container (user can have multiple). */
export interface UserPortfolio {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  positionCount: number;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  purchaseDate?: string; // YYYY-MM-DD, optional
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  addedAt: string;
}

export interface EnrichedWatchlistItem extends WatchlistItem {
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
}

export interface EnrichedPosition extends PortfolioPosition {
  currentPrice: number;
  marketValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPL: number;
  totalPLPercent: number;
}

export interface HistoricalDataPoint {
  time: string | number; // string "YYYY-MM-DD" for daily, number (Unix s) for intraday
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

/** Row from Yahoo predefined screener (gainers, losers, most active, etc.). */
export interface MarketMoverQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  currency: string;
}

export interface MarketMoversBoard {
  gainers: MarketMoverQuote[];
  losers: MarketMoverQuote[];
  mostActive: MarketMoverQuote[];
  undervaluedLargeCaps: MarketMoverQuote[];
}

export interface CompanyOfficer {
  name: string;
  title: string;
  age?: number;
  yearBorn?: number;
  totalPay?: number;
  exercisedValue?: number;
  unexercisedValue?: number;
}

export interface InsiderTransaction {
  filerName: string;
  filerRelation: string;
  transactionText: string;
  shares: number;
  value?: number;
  startDate: string;
  ownership: string;
}

export interface EarningsChartQuarterly {
  date: string;
  actual?: number;
  estimate: number;
}

export interface FinancialsChartEntry {
  date: string | number;
  revenue: number;
  earnings: number;
}

export interface RecommendationTrendEntry {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface UpgradeDowngradeEntry {
  date: string;
  firm: string;
  toGrade: string;
  fromGrade: string;
  action: string;
}

export interface EarningsTrendEntry {
  period: string;
  endDate: string | null;
  growth: number | null;
  earningsEstimate: {
    avg: number | null;
    low: number | null;
    high: number | null;
    yearAgoEps: number | null;
    numberOfAnalysts: number | null;
    growth: number | null;
  };
  revenueEstimate: {
    avg: number | null;
    low: number | null;
    high: number | null;
    numberOfAnalysts: number | null;
    yearAgoRevenue: number | null;
    growth: number | null;
  };
}

export interface PitchSections {
  thesis: string;
  companyOverview: string;
  valuation: string;
  financials: string;
  catalysts: string;
  risks: string;
  recommendation: string;
}

export interface StockPitch {
  id: string;
  symbol: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
  sections: PitchSections;
}

export const PITCH_SECTION_META: {
  key: keyof PitchSections;
  label: string;
  description: string;
}[] = [
  {
    key: "thesis",
    label: "Investment Thesis",
    description: "Core argument for why this stock is a buy, sell, or hold",
  },
  {
    key: "companyOverview",
    label: "Company Overview",
    description: "Business model, industry position, and competitive advantages",
  },
  {
    key: "valuation",
    label: "Valuation Analysis",
    description: "Key multiples, relative valuation, and fair value assessment",
  },
  {
    key: "financials",
    label: "Financial Highlights",
    description: "Revenue, earnings, margins, and balance sheet strength",
  },
  {
    key: "catalysts",
    label: "Growth Catalysts",
    description: "Upcoming events, trends, or factors that could drive the stock higher",
  },
  {
    key: "risks",
    label: "Key Risks",
    description: "Major risks and potential headwinds to the investment thesis",
  },
  {
    key: "recommendation",
    label: "Price Target & Recommendation",
    description: "Final recommendation with a price target and time horizon",
  },
];

export interface QuoteSummaryData {
  // Overview / Profile
  shortName: string;
  longName: string;
  symbol: string;
  /** Yahoo Finance exchange code from quote summary (e.g. NMS, NYQ) */
  exchange: string;
  /** Yahoo `exchangeName` on price module; used with `exchange` for TradingView */
  exchangeName: string;
  longBusinessSummary: string;
  sector: string;
  industry: string;
  website: string;
  fullTimeEmployees: number;
  city: string;
  state: string;
  country: string;
  phone: string;

  // Price
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  marketCap: number;
  currency: string;

  // Valuation
  trailingPE: number;
  forwardPE: number;
  priceToBook: number;
  priceToSalesTrailing12Months: number;
  enterpriseValue: number;
  enterpriseToRevenue: number;
  enterpriseToEbitda: number;
  pegRatio: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;

  // Financial Data
  totalRevenue: number;
  revenuePerShare: number;
  revenueGrowth: number;
  grossMargins: number;
  ebitdaMargins: number;
  operatingMargins: number;
  profitMargins: number;
  returnOnAssets: number;
  returnOnEquity: number;
  earningsGrowth: number;
  ebitda: number;
  grossProfits: number;

  // Solvency
  totalDebt: number;
  totalCash: number;
  totalCashPerShare: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  freeCashflow: number;
  operatingCashflow: number;

  // Key Statistics
  sharesOutstanding: number;
  floatShares: number;
  sharesShort: number;
  shortRatio: number;
  heldPercentInsiders: number;
  heldPercentInstitutions: number;
  bookValue: number;
  trailingEps: number;
  forwardEps: number;

  // Dividends
  dividendRate: number;
  dividendYield: number;
  exDividendDate: string;
  payoutRatio: number;
  fiveYearAvgDividendYield: number;
  trailingAnnualDividendRate: number;
  trailingAnnualDividendYield: number;
  lastDividendValue: number;
  lastDividendDate: string;

  // Forecast
  targetHighPrice: number;
  targetLowPrice: number;
  targetMeanPrice: number;
  targetMedianPrice: number;
  recommendationKey: string;
  recommendationMean: number;
  numberOfAnalystOpinions: number;

  // Calendar
  earningsDate: string;
  dividendPayDate: string;

  // Earnings Charts
  earningsChartQuarterly: EarningsChartQuarterly[];
  financialsChartYearly: FinancialsChartEntry[];
  financialsChartQuarterly: FinancialsChartEntry[];

  // Trends
  earningsTrend: EarningsTrendEntry[];
  recommendationTrend: RecommendationTrendEntry[];
  upgradeDowngradeHistory: UpgradeDowngradeEntry[];

  // People
  companyOfficers: CompanyOfficer[];

  // Transactions
  insiderTransactions: InsiderTransaction[];
  netSharePurchaseActivity: {
    buyInfoCount: number;
    buyInfoShares: number;
    sellInfoCount: number;
    sellInfoShares: number;
    netInfoCount: number;
    netInfoShares: number;
    totalInsiderShares: number;
  } | null;
}

export interface SECAnnualFinancialRow {
  fiscalYear: string;
  revenue: number | null;
  /** Yahoo annual fundamentals only; omitted on older cached SEC payloads. */
  ebitda?: number | null;
  capex: number | null;
  depreciation: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  workingCapital: number | null;
  operatingCashflow: number | null;
}

export interface SECFinancials {
  symbol: string;
  cik: string;
  annualData: SECAnnualFinancialRow[];
  /** Where annual rows came from; SEC is preferred when available. */
  dataSource?: "sec" | "yahoo" | "mixed";
}

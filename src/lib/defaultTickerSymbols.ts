/**
 * Default header ticker when the user has not chosen portfolio/custom (or is logged out).
 * Keep index symbols in sync with `INDEX_SYMBOLS` in `MarketOverview.tsx` for dashboard index cards.
 */
export const DEFAULT_TICKER_SYMBOLS = [
  "^GSPC",
  "^DJI",
  "^IXIC",
  "^VIX",
  "^GSPTSE",
  "GC=F",
  "CL=F",
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
  "BRK-B",
  "ORCL",
  "BTC-USD",
  "TSM",
  "ASML",
  "AVGO",
  "MU",
  "SNPS",
] as const;

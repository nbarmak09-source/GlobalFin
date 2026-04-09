/**
 * Map Yahoo Finance exchange codes to TradingView chart prefixes.
 * @see https://www.iso20022.org/market-identifier-codes (Yahoo uses MIC-like codes)
 */

const YAHOO_EXCHANGE_TO_TRADINGVIEW: Record<string, string> = {
  // Nasdaq
  NMS: "NASDAQ",
  NGM: "NASDAQ",
  NCM: "NASDAQ",
  NASDAQ: "NASDAQ",
  NAS: "NASDAQ",
  // NYSE
  NYQ: "NYSE",
  NYSE: "NYSE",
  // NYSE Arca (ETFs e.g. SPY)
  PCX: "NYSEARCA",
  ARCA: "NYSEARCA",
  // NYSE American
  ASE: "AMEX",
  AMEX: "AMEX",
  // BATS
  BTS: "BATS",
  BATS: "BATS",
  // OTC
  OQB: "OTCMKTS",
  OQX: "OTCMKTS",
  PNK: "OTCMKTS",
  OTC: "OTCMKTS",
  // Canada
  TOR: "TSX",
  VAN: "TSXV",
  CNQ: "CSE",
};

function inferTradingViewPrefixFromName(exchangeName: string): string | null {
  const n = exchangeName.toLowerCase();
  if (n.includes("nasdaq")) return "NASDAQ";
  if (n.includes("nyse arca") || /\barca\b/.test(n)) return "NYSEARCA";
  if (n.includes("nyse american") || n.includes("nyse mkt")) return "AMEX";
  if (n.includes("new york")) return "NYSE";
  if (n.includes("toronto") || n === "tsx") return "TSX";
  if (n.includes("venture") || n.includes("tsxv")) return "TSXV";
  if (n.includes("otc")) return "OTCMKTS";
  return null;
}

export interface TradingViewSymbolOptions {
  /** Yahoo `quote.exchange` or `quoteSummary.price.exchange` (e.g. NMS, NYQ, PCX) */
  yahooExchange?: string;
  /** Yahoo `quote.fullExchangeName` or `quoteSummary.price.exchangeName` */
  yahooExchangeName?: string;
}

export function getTradingViewSymbol(
  symbol: string,
  opts?: TradingViewSymbolOptions
): string {
  const upper = symbol.toUpperCase();

  if (upper.startsWith("^")) {
    if (upper === "^GSPC") return "SP:SPX";
    if (upper === "^DJI") return "DJ:DJI";
    if (upper === "^IXIC") return "NASDAQ:NDX";
    if (upper === "^RUT") return "TVC:RUT";
    if (upper === "^GSPTSE") return "TSX:OSPTX";
  }

  const yahooEx = (opts?.yahooExchange || "").toUpperCase().trim();
  if (yahooEx && YAHOO_EXCHANGE_TO_TRADINGVIEW[yahooEx]) {
    return `${YAHOO_EXCHANGE_TO_TRADINGVIEW[yahooEx]}:${upper}`;
  }

  const name = (opts?.yahooExchangeName || "").trim();
  if (name) {
    const inferred = inferTradingViewPrefixFromName(name);
    if (inferred) return `${inferred}:${upper}`;
  }

  return `NYSE:${upper}`;
}

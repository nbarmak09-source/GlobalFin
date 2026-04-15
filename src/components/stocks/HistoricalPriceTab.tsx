"use client";

import { useState, useEffect } from "react";
import TradingViewChart from "@/components/TradingViewChart";
import type { StockQuote, QuoteSummaryData } from "@/lib/types";
import { BarChart3 } from "lucide-react";

const PERIODS = [
  { label: "1D", interval: "5" },
  { label: "5D", interval: "60" },
  { label: "1M", interval: "D" },
  { label: "3M", interval: "D" },
  { label: "6M", interval: "D" },
  { label: "YTD", interval: "D" },
  { label: "1Y", interval: "D" },
  { label: "5Y", interval: "W" },
];

function fmt2(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number | null | undefined, decimals = 1) {
  if (v == null || isNaN(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}
function fmtLarge(v: number | null | undefined) {
  if (!v) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3)  return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}
function fmtVol(v: number | null | undefined) {
  if (!v) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
}
function StatRow({ label, value, color }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-card border border-border text-sm">
      <span className="text-muted shrink-0">{label}</span>
      <span className={`font-mono font-medium text-right ${color ?? ""}`}>{value}</span>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}
function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest px-1">{title}</p>
      {children}
    </div>
  );
}

interface Props {
  symbol: string;
  summaryData?: QuoteSummaryData;
  /** When parent already fetched quote (e.g. stocks page), skip duplicate request */
  initialQuote?: StockQuote;
}

export default function HistoricalPriceTab({ symbol, summaryData, initialQuote }: Props) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[6]);
  const [quote, setQuote] = useState<StockQuote | null>(initialQuote ?? null);

  useEffect(() => {
    setQuote(initialQuote ?? null);
  }, [symbol, initialQuote]);

  useEffect(() => {
    if (initialQuote) return;
    async function fetchQuote() {
      try {
        const res = await fetch(`/api/stocks?action=quote&symbol=${encodeURIComponent(symbol)}`);
        if (res.ok) setQuote(await res.json());
      } catch { /* silently fail */ }
    }
    fetchQuote();
  }, [symbol, initialQuote]);

  const d = summaryData;

  const dayRangePct =
    quote && quote.regularMarketDayHigh !== quote.regularMarketDayLow
      ? Math.min(100, Math.max(0,
          ((quote.regularMarketPrice - quote.regularMarketDayLow) /
            (quote.regularMarketDayHigh - quote.regularMarketDayLow)) * 100
        ))
      : null;

  const rec = d?.recommendationKey
    ? { strong_buy: "Strong Buy", buy: "Buy", hold: "Hold", sell: "Sell", strong_sell: "Strong Sell" }[d.recommendationKey] ?? d.recommendationKey
    : null;
  const recColor = rec
    ? ["Strong Buy", "Buy"].includes(rec) ? "text-green"
      : ["Sell", "Strong Sell"].includes(rec) ? "text-red"
      : ""
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              p.label === period.label
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-w-0 overflow-hidden items-start">
        <div className="lg:col-span-3 min-w-0 w-full flex flex-col h-[min(62vh,580px)] min-h-[320px]">
          <TradingViewChart
            fill
            symbol={symbol}
            interval={period.interval}
            yahooExchange={quote?.exchange}
            yahooExchangeName={quote?.exchangeName}
          />
        </div>

        {quote && (
          <div className="space-y-4 overflow-y-auto max-h-[min(62vh,580px)]">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </h3>

            {/* Today section */}
            <Section title="Today">
              {dayRangePct !== null && (
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-muted">
                    <span>L <span className="text-foreground font-medium">${fmt2(quote.regularMarketDayLow)}</span></span>
                    <span className="text-muted/60">Day range</span>
                    <span>H <span className="text-foreground font-medium">${fmt2(quote.regularMarketDayHigh)}</span></span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-border">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent/60" style={{ width: `${dayRangePct}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-1.5 rounded-full bg-foreground border border-border shadow" style={{ left: `${dayRangePct}%` }} />
                  </div>
                </div>
              )}
              <StatRow label="Open" value={`$${fmt2(quote.regularMarketOpen)}`} />
              <StatRow label="Prev Close" value={`$${fmt2(quote.regularMarketPreviousClose)}`} />
              <StatRow
                label="Change"
                value={`${quote.regularMarketChange >= 0 ? "+" : ""}$${fmt2(quote.regularMarketChange)} (${quote.regularMarketChangePercent >= 0 ? "+" : ""}${quote.regularMarketChangePercent.toFixed(2)}%)`}
                color={quote.regularMarketChange >= 0 ? "text-green" : "text-red"}
              />
              {quote.preMarketPrice != null && quote.preMarketPrice > 0 && (
                <StatRow
                  label="Pre-market"
                  value={`$${fmt2(quote.preMarketPrice)} · ${(quote.preMarketChange ?? 0) >= 0 ? "+" : ""}${fmt2(quote.preMarketChange)} (${(quote.preMarketChangePercent ?? 0) >= 0 ? "+" : ""}${(quote.preMarketChangePercent ?? 0).toFixed(2)}%)`}
                  color={(quote.preMarketChange ?? 0) >= 0 ? "text-green" : "text-red"}
                />
              )}
              {quote.postMarketPrice != null && quote.postMarketPrice > 0 && (
                <StatRow
                  label="After hours"
                  value={`$${fmt2(quote.postMarketPrice)} · ${(quote.postMarketChange ?? 0) >= 0 ? "+" : ""}${fmt2(quote.postMarketChange)} (${(quote.postMarketChangePercent ?? 0) >= 0 ? "+" : ""}${(quote.postMarketChangePercent ?? 0).toFixed(2)}%)`}
                  color={(quote.postMarketChange ?? 0) >= 0 ? "text-green" : "text-red"}
                />
              )}
              <StatRow label="Volume" value={fmtVol(quote.regularMarketVolume)} />
              <StatRow label="Exchange" value={quote.exchangeName || quote.exchange || "—"} />
              <StatRow label="Currency" value={quote.currency || "USD"} />
            </Section>

            {/* Valuation */}
            <Section title="Valuation">
              <StatRow label="P/E (TTM)" value={quote.trailingPE ? quote.trailingPE.toFixed(2) : "—"} />
              <StatRow label="Fwd P/E" value={d?.forwardPE ? d.forwardPE.toFixed(2) : "—"} />
              <StatRow label="PEG Ratio" value={d?.pegRatio ? d.pegRatio.toFixed(2) : "—"} />
              <StatRow label="P/B" value={d?.priceToBook ? d.priceToBook.toFixed(2) : "—"} />
              <StatRow label="P/S (TTM)" value={d?.priceToSalesTrailing12Months ? d.priceToSalesTrailing12Months.toFixed(2) : "—"} />
              <StatRow label="EV/Revenue" value={d?.enterpriseToRevenue ? d.enterpriseToRevenue.toFixed(2) : "—"} />
              <StatRow label="EV/EBITDA" value={d?.enterpriseToEbitda ? d.enterpriseToEbitda.toFixed(2) : "—"} />
              <StatRow label="EPS (TTM)" value={d?.trailingEps ? `$${fmt2(d.trailingEps)}` : "—"} />
              <StatRow label="Fwd EPS" value={d?.forwardEps ? `$${fmt2(d.forwardEps)}` : "—"} />
              <StatRow label="Book Value" value={d?.bookValue ? `$${fmt2(d.bookValue)}` : "—"} />
            </Section>

            {/* Growth & Margins */}
            <Section title="Growth & Margins">
              <StatRow
                label="Rev Growth (YoY)"
                value={fmtPct(d?.revenueGrowth)}
                color={d?.revenueGrowth != null ? (d.revenueGrowth >= 0 ? "text-green" : "text-red") : ""}
              />
              <StatRow
                label="Earnings Growth"
                value={fmtPct(d?.earningsGrowth)}
                color={d?.earningsGrowth != null ? (d.earningsGrowth >= 0 ? "text-green" : "text-red") : ""}
              />
              <StatRow label="Gross Margin" value={fmtPct(d?.grossMargins)} />
              <StatRow label="Op Margin" value={fmtPct(d?.operatingMargins)} />
              <StatRow label="Net Margin" value={fmtPct(d?.profitMargins)} />
              <StatRow label="EBITDA Margin" value={fmtPct(d?.ebitdaMargins)} />
              <StatRow label="ROE" value={fmtPct(d?.returnOnEquity)} />
              <StatRow label="ROA" value={fmtPct(d?.returnOnAssets)} />
            </Section>

            {/* Balance Sheet */}
            <Section title="Balance Sheet">
              <StatRow label="Market Cap" value={fmtLarge(d?.marketCap ?? quote.marketCap)} />
              <StatRow label="Enterprise Value" value={fmtLarge(d?.enterpriseValue)} />
              <StatRow label="Revenue (TTM)" value={fmtLarge(d?.totalRevenue)} />
              <StatRow label="EBITDA" value={fmtLarge(d?.ebitda)} />
              <StatRow label="Free Cash Flow" value={fmtLarge(d?.freeCashflow)} />
              <StatRow label="Op Cash Flow" value={fmtLarge(d?.operatingCashflow)} />
              <StatRow label="Total Cash" value={fmtLarge(d?.totalCash)} />
              <StatRow label="Total Debt" value={fmtLarge(d?.totalDebt)} />
              <StatRow label="D/E Ratio" value={d?.debtToEquity ? `${d.debtToEquity.toFixed(1)}×` : "—"} />
              <StatRow label="Current Ratio" value={d?.currentRatio ? d.currentRatio.toFixed(2) : "—"} />
              <StatRow label="Quick Ratio" value={d?.quickRatio ? d.quickRatio.toFixed(2) : "—"} />
            </Section>

            {/* Ownership */}
            <Section title="Ownership">
              <StatRow label="Shares Out." value={d?.sharesOutstanding ? `${(d.sharesOutstanding / 1e9).toFixed(2)}B` : "—"} />
              <StatRow label="Float" value={d?.floatShares ? `${(d.floatShares / 1e9).toFixed(2)}B` : "—"} />
              <StatRow label="Short Ratio" value={d?.shortRatio ? `${d.shortRatio.toFixed(2)}x` : "—"} />
              <StatRow label="Insider Own." value={fmtPct(d?.heldPercentInsiders)} />
              <StatRow label="Inst. Own." value={fmtPct(d?.heldPercentInstitutions)} />
            </Section>

            {/* Analyst */}
            {(d?.targetMeanPrice || d?.recommendationKey) && (
              <Section title="Analyst Consensus">
                {rec && <StatRow label="Rating" value={rec} color={recColor} />}
                <StatRow label="# Analysts" value={d?.numberOfAnalystOpinions ? String(d.numberOfAnalystOpinions) : "—"} />
                <StatRow label="Mean Target" value={d?.targetMeanPrice ? `$${fmt2(d.targetMeanPrice)}` : "—"} />
                <StatRow label="High Target" value={d?.targetHighPrice ? `$${fmt2(d.targetHighPrice)}` : "—"} />
                <StatRow label="Low Target" value={d?.targetLowPrice ? `$${fmt2(d.targetLowPrice)}` : "—"} />
              </Section>
            )}

            {/* Dividends */}
            {d?.dividendYield ? (
              <Section title="Dividends">
                <StatRow label="Yield" value={fmtPct(d.dividendYield)} color="text-accent" />
                <StatRow label="Annual Rate" value={d.dividendRate ? `$${fmt2(d.dividendRate)}` : "—"} />
                <StatRow label="Payout Ratio" value={fmtPct(d.payoutRatio)} />
                <StatRow label="Ex-Date" value={d.exDividendDate || "—"} />
              </Section>
            ) : null}

            {/* Calendar */}
            {d?.earningsDate && (
              <Section title="Calendar">
                <StatRow label="Next Earnings" value={d.earningsDate} />
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

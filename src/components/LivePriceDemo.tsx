"use client";

import { useLivePrices } from "@/hooks/useLivePrices";
import { PriceCell } from "@/components/PriceCell";
import { DEFAULT_TICKER_SYMBOLS } from "@/lib/defaultTickerSymbols";

/** Same universe as the header ticker / dashboard defaults; capped for the grid. */
const SYMBOLS = DEFAULT_TICKER_SYMBOLS.slice(0, 12);
const POLL_INTERVAL = 20_000;

export function LivePriceDemo() {
  const { data, loading, error, lastUpdated } = useLivePrices(SYMBOLS, {
    interval: POLL_INTERVAL,
  });

  return (
    <section className="live-price-demo" aria-label="Live quotes">
      <div className="live-price-demo__status">
        {loading && (
          <span className="live-price-demo__badge live-price-demo__badge--loading">
            Connecting…
          </span>
        )}
        {error && (
          <span className="live-price-demo__badge live-price-demo__badge--error">
            Error: {error}
          </span>
        )}
        {lastUpdated && !error && (
          <span className="live-price-demo__badge live-price-demo__badge--ok">
            Live · updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="live-price-demo__grid">
        {SYMBOLS.map((sym) => (
          <div key={sym} className="live-price-demo__card">
            <PriceCell quote={data[sym]} showSymbol showName decimals={2} />
          </div>
        ))}
      </div>
    </section>
  );
}

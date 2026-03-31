import { BookOpen } from "lucide-react";

/**
 * Documents where stock tab numbers come from (matches `getQuoteSummary` in `src/lib/yahoo.ts`).
 */
export function StockDataCitation({ tab }: { tab: "valuation" | "financials" }) {
  return (
    <aside className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6 text-xs text-muted leading-relaxed space-y-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-accent shrink-0" />
        Data sources & limitations
      </h4>
      <p>
        Figures on this tab are loaded from{" "}
        <strong className="text-foreground">Yahoo Finance</strong> using the open-source{" "}
        <a
          href="https://www.npmjs.com/package/yahoo-finance2"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          yahoo-finance2
        </a>{" "}
        client. The app calls Yahoo&apos;s{" "}
        <code className="rounded bg-card px-1 py-0.5 text-[11px] text-foreground/90">
          quoteSummary
        </code>{" "}
        endpoint for the selected symbol (see{" "}
        <code className="rounded bg-card px-1 py-0.5 text-[11px] text-foreground/90">
          getQuoteSummary
        </code>{" "}
        in <code className="text-[11px]">src/lib/yahoo.ts</code>). Data may be{" "}
        <strong className="text-foreground">delayed</strong>, rounded, or revised by the
        provider; it is not a substitute for filings or your own analysis.
      </p>

      {tab === "valuation" ? (
        <ul className="list-disc pl-4 space-y-2 marker:text-accent/80">
          <li>
            <strong className="text-foreground">Price, market cap, 52-week range, volume:</strong>{" "}
            Yahoo modules <code className="text-[11px]">price</code>,{" "}
            <code className="text-[11px]">summaryDetail</code>.
          </li>
          <li>
            <strong className="text-foreground">Multiples &amp; size metrics</strong> (e.g. P/E,
            P/B, P/S, EV, EV/EBITDA, beta, shares, book value, EPS):{" "}
            <code className="text-[11px]">defaultKeyStatistics</code>,{" "}
            <code className="text-[11px]">summaryDetail</code>,{" "}
            <code className="text-[11px]">financialData</code>.
          </li>
          <li>
            <strong className="text-foreground">Analyst targets &amp; recommendation:</strong>{" "}
            <code className="text-[11px]">financialData</code> (consensus fields).
          </li>
          <li>
            <strong className="text-foreground">Margins &amp; returns</strong> shown here:{" "}
            <code className="text-[11px]">financialData</code> (and some fallbacks from{" "}
            <code className="text-[11px]">defaultKeyStatistics</code> where mapped).
          </li>
          <li>
            <strong className="text-foreground">Fair value headline</strong> uses the{" "}
            <em>analyst mean price target</em> as a proxy, not an independent DCF. Intrinsic
            models are available under Financial Models.
          </li>
        </ul>
      ) : (
        <ul className="list-disc pl-4 space-y-2 marker:text-accent/80">
          <li>
            <strong className="text-foreground">Revenue &amp; earnings history charts:</strong>{" "}
            Yahoo <code className="text-[11px]">earnings</code> module —{" "}
            <code className="text-[11px]">financialsChart</code> (yearly/quarterly) and{" "}
            <code className="text-[11px]">earningsChart</code> (EPS actual vs estimate).
          </li>
          <li>
            <strong className="text-foreground">Income &amp; cash-flow totals, margins, growth:</strong>{" "}
            <code className="text-[11px]">financialData</code>.
          </li>
          <li>
            <strong className="text-foreground">Financial health checks</strong> (liquidity,
            leverage, cash vs debt, FCF/OCF): derived from{" "}
            <code className="text-[11px]">financialData</code> fields such as{" "}
            <code className="text-[11px]">currentRatio</code>,{" "}
            <code className="text-[11px]">quickRatio</code>,{" "}
            <code className="text-[11px]">debtToEquity</code>,{" "}
            <code className="text-[11px]">totalCash</code>,{" "}
            <code className="text-[11px]">totalDebt</code>,{" "}
            <code className="text-[11px]">freeCashflow</code>,{" "}
            <code className="text-[11px]">operatingCashflow</code>.
          </li>
          <li>
            Health checks are <strong className="text-foreground">heuristic rules</strong> for
            scanning only — not investment advice and not identical to credit-rating or banking
            covenant tests.
          </li>
        </ul>
      )}
    </aside>
  );
}

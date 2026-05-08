import Link from "next/link";
import { Calculator, LineChart, Scale, Landmark, Sparkles, FileText } from "lucide-react";

export default function ModelsOverviewPage() {
  return (
    <div className="space-y-8 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Financial Models</h1>
          <p className="text-sm text-muted max-w-2xl leading-relaxed">
            Choose a valuation tool below. For pitch decks and filing digests, use{" "}
            <Link href="/pitch" className="text-accent hover:underline">
              Pitch builder
            </Link>{" "}
            or{" "}
            <Link href="/filings" className="text-accent hover:underline">
              SEC filing summaries
            </Link>{" "}
            from the Tools sidebar.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
          <Calculator className="h-3.5 w-3.5" />
          <span>Valuation toolkit</span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-accent">
            <LineChart className="h-5 w-5 shrink-0" />
            <h2 className="text-base font-semibold text-foreground">DCF</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed flex-1">
            Estimates intrinsic value by forecasting free cash flows, applying a discount rate
            (WACC), and solving for equity value vs. today&apos;s price. Use it to stress-test
            growth, margins, and terminal assumptions—typically after sanity-checking comps.
          </p>
          <p className="text-xs text-muted">
            <strong className="text-foreground">How to use:</strong> open the tool, enter a
            ticker, refine revenue/EBITDA/FCFF paths and perpetuity assumptions, then compare
            implied value per share to the market.
          </p>
          <Link
            href="/models/dcf"
            className="text-sm font-medium text-accent hover:underline w-fit mt-1"
          >
            Open DCF model →
          </Link>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-accent">
            <Scale className="h-5 w-5 shrink-0" />
            <h2 className="text-base font-semibold text-foreground">Comps / multiples</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed flex-1">
            Values the company versus peers using trading multiples (e.g. EV/EBITDA, P/E).
            Best when names are truly comparable—same cycle, geography, and business model—and
            you want a market-implied range rather than a long explicit forecast.
          </p>
          <p className="text-xs text-muted">
            <strong className="text-foreground">How to use:</strong> select a symbol, review
            suggested peers and multiples, then adjust medians/means or pick a benchmark
            multiple to derive implied pricing.
          </p>
          <Link
            href="/models/comps"
            className="text-sm font-medium text-accent hover:underline w-fit mt-1"
          >
            Open comps model →
          </Link>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-accent">
            <Landmark className="h-5 w-5 shrink-0" />
            <h2 className="text-base font-semibold text-foreground">LBO</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed flex-1">
            Structures a leveraged buyout: purchase price, debt tranches, interest, amortization,
            and an exit multiple to produce IRR and MOIC. Suited for thinking like a sponsor—
            highly sensitive to leverage, terms, and hold period—not for fair-market “standalone”
            DCF comparisons alone.
          </p>
          <p className="text-xs text-muted">
            <strong className="text-foreground">How to use:</strong> enter your target, layer in
            entry EV, debt sizing, schedules, and exit assumptions; iterate until returns match
            your hurdle or market precedents.
          </p>
          <Link
            href="/models/lbo"
            className="text-sm font-medium text-accent hover:underline w-fit mt-1"
          >
            Open LBO model →
          </Link>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold font-serif">Other tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-semibold text-foreground">Pitch builder</h3>
            </div>
            <p className="text-sm text-muted leading-relaxed flex-1">
              Draft a structured stock pitch with AI-assisted sections—thesis, catalysts, risks,
              valuation view, and recommendation—then export or refine in place.
            </p>
            <Link href="/pitch" className="text-sm font-medium text-accent hover:underline w-fit">
              Open pitch builder →
            </Link>
          </article>
          <article className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-accent">
              <FileText className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-semibold text-foreground">SEC filing summaries</h3>
            </div>
            <p className="text-sm text-muted leading-relaxed flex-1">
              Pull 10-K or 10-Q text from EDGAR (or upload your own filing) and get a condensed
              summary of risks, results, and management narrative.
            </p>
            <Link href="/filings" className="text-sm font-medium text-accent hover:underline w-fit">
              Open filing summaries →
            </Link>
          </article>
        </div>
      </section>

      <p className="text-xs text-muted max-w-2xl border-t border-border pt-6">
        Outputs are educational and depend on data availability and your inputs—they are not
        investment advice. Cross-check against filings and your firm&apos;s policy for external
        models.
      </p>
    </div>
  );
}

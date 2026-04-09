"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Factory,
  Handshake,
  ExternalLink,
  X,
  ChevronRight,
} from "lucide-react";

type MacroId = "ip" | "cpi" | "m2" | "businessCycle" | "ism" | "sentiment";

const MACRO_DESCRIPTIONS: Record<
  MacroId,
  { title: string; whatItIs: string; howItWorks: string; investingImpact: string }
> = {
  ip: {
    title: "Industrial Production",
    whatItIs:
      "A monthly index from the Federal Reserve that measures the real output of manufacturing, mining, and electric and gas utilities. The index is normalized (2017 = 100) and reflects the physical volume of goods produced.",
    howItWorks:
      "The Fed aggregates data from production surveys and industry reports. Month-over-month and year-over-year changes show whether industrial activity is accelerating or slowing. Revisions are common as more complete data arrives.",
    investingImpact:
      "Rising industrial production usually supports cyclical sectors (industrials, materials) and risk-on sentiment. Falling or flat production can signal economic softness and may favor defensive assets, quality, or cash. Watch the trend and YoY direction.",
  },
  cpi: {
    title: "CPI (Consumer Price Index)",
    whatItIs:
      "The Consumer Price Index measures the average change over time in prices paid by urban consumers for a basket of goods and services. The headline number is the year-over-year percentage change, often called the inflation rate.",
    howItWorks:
      "The Bureau of Labor Statistics collects prices for thousands of items. The basket is weighted by typical consumer spending. Core CPI excludes food and energy to reduce volatility. Central banks use it to set interest-rate policy.",
    investingImpact:
      "High or rising inflation erodes real returns on bonds and cash and often leads to higher interest rates, which can pressure growth stocks and valuations. Moderating inflation can support risk assets. Long-term, real assets and equities have historically hedged inflation better than fixed income.",
  },
  m2: {
    title: "M2 Money Supply",
    whatItIs:
      "M2 is a broad measure of the money supply that includes cash, checking and savings deposits, small time deposits, and retail money market funds. It represents liquidity available to households and non-financial businesses.",
    howItWorks:
      "The Federal Reserve reports M2 based on data from banks and other depository institutions. Growth in M2 reflects expansion or contraction of credit and deposits. The Fed’s balance sheet and bank lending are key drivers.",
    investingImpact:
      "Rapid M2 growth has historically been associated with stronger asset prices and inflation; sharp slowdowns or contractions can signal tighter financial conditions and have preceded recessions or risk-off periods. Use as context for liquidity and credit conditions.",
  },
  businessCycle: {
    title: "Business Cycle",
    whatItIs:
      "The business cycle is the recurring pattern of expansion and contraction in economic activity. Recessions are officially dated by the NBER. Recession probability models (e.g. from the yield curve) estimate the likelihood of a downturn.",
    howItWorks:
      "Indicators include GDP growth, employment, income, and industrial production. Some models use financial signals (e.g. yield curve inversion) to estimate recession probability. Expansion vs recession affects how policymakers and markets behave.",
    investingImpact:
      "In or near recession, investors often favor defensive sectors, quality, and cash; duration and credit risk in bonds can be managed more cautiously. In expansion, cyclical and risk-on positioning has historically done better. Use probability as one input among many.",
  },
  ism: {
    title: "Manufacturing PMI (Confidence)",
    whatItIs:
      "The ISM Manufacturing PMI (or similar surveys) reflects purchasing managers’ views on new orders, production, employment, supplier deliveries, and inventories. It is a diffusion index: above 50 indicates expansion, below 50 contraction.",
    howItWorks:
      "Surveys are conducted monthly. Responses are aggregated into subindexes and a headline number. Readings are timely and forward-looking. The OECD business tendency series used here is a comparable confidence indicator.",
    investingImpact:
      "Readings above 50 support cyclical and industrial exposure; sustained readings below 50 can signal manufacturing weakness and may warrant a more defensive or selective stance. Compare with services PMI and employment data for a fuller picture.",
  },
  sentiment: {
    title: "Consumer Sentiment",
    whatItIs:
      "Consumer sentiment indexes (e.g. University of Michigan) measure how households view current economic conditions and their expectations for the future. They reflect confidence, spending intentions, and expectations about income and employment.",
    howItWorks:
      "Surveys ask about personal finances, business conditions, and buying plans. The index level and its change over time are reported. Sentiment can swing with gas prices, jobs news, and geopolitical events.",
    investingImpact:
      "High or improving sentiment often supports consumer discretionary and risk-on positioning; low or falling sentiment can precede weaker spending and more defensive positioning. Use alongside hard data (retail sales, employment) rather than in isolation.",
  },
};

interface MacroData {
  asOf: string;
  industrialProduction: {
    value: number | null;
    previous: number | null;
    change: number | null;
    yoyChange: number | null;
    date: string;
    sourceUrl: string;
  };
  cpi: {
    value: number | null;
    yoyChange: number | null;
    date: string;
    sourceUrl: string;
  };
  m2: {
    value: number | null;
    yoyChange: number | null;
    date: string;
    sourceUrl: string;
  };
  businessCycle: {
    inRecession: boolean;
    recessionProbability: number | null;
    date: string;
    sourceUrl: string;
  };
  ismManufacturing: {
    value: number | null;
    previous: number | null;
    change: number | null;
    date: string;
    sourceUrl: string;
  };
  consumerSentiment: {
    value: number | null;
    previous: number | null;
    change: number | null;
    date: string;
    sourceUrl: string;
  };
}

function FredSourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 p-0.5 transition-colors text-[#8b949e] hover:text-[#c9a227]"
      title="View series on FRED"
      aria-label="View series on FRED"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

export default function MacroIndicators() {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<MacroId | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/macro-indicators", {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json.error) throw new Error();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedMacro) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedMacro(null);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedMacro]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-card animate-pulse"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-card p-4 text-center text-sm text-muted" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
        Macro indicator data unavailable. Make sure FRED_API_KEY is set in your
        .env file.
      </div>
    );
  }

  const {
    industrialProduction: ip,
    cpi,
    m2,
    businessCycle,
    ismManufacturing: ismMfg,
    consumerSentiment: sentiment,
  } = data;

  const selectedContent = selectedMacro ? MACRO_DESCRIPTIONS[selectedMacro] : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Industrial Production */}
        <button
          type="button"
          onClick={() => setSelectedMacro("ip")}
          className="rounded-lg bg-card p-4 text-left w-full hover:bg-card-hover transition-colors cursor-pointer group"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-[400] text-muted flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-accent" />
              Industrial Production
            </span>
            <span className="flex items-center gap-1">
              <FredSourceLink href={ip.sourceUrl} />
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent shrink-0" />
            </span>
          </div>
          <div className="text-[30px] font-[500] font-mono leading-none">
            {ip.value != null ? ip.value.toFixed(1) : "—"}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {ip.yoyChange != null && (
              <span
                className={`inline-flex items-center gap-1 text-[13px] font-[400] font-mono ${
                  ip.yoyChange >= 0 ? "text-green" : "text-red"
                }`}
              >
                {ip.yoyChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {ip.yoyChange >= 0 ? "+" : ""}
                {ip.yoyChange.toFixed(1)}% YoY
              </span>
            )}
            {ip.change != null && (
              <span
                className={`text-[13px] font-[400] font-mono ${
                  ip.change >= 0 ? "text-green" : "text-red"
                }`}
              >
                {ip.change >= 0 ? "+" : ""}
                {ip.change.toFixed(2)} MoM
              </span>
            )}
          </div>
          <div className="text-[11px] font-[400] text-muted mt-2" style={{ color: "var(--muted)", opacity: 0.7 }}>
            Fed index (2017 = 100)
            {ip.date &&
              ` · ${new Date(ip.date).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}`}
          </div>
        </button>

        {/* CPI */}
        <button
          type="button"
          onClick={() => setSelectedMacro("cpi")}
          className="rounded-lg bg-card p-4 text-left w-full hover:bg-card-hover transition-colors cursor-pointer group"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-[400] text-muted flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              CPI (Inflation)
            </span>
            <span className="flex items-center gap-1">
              <FredSourceLink href={cpi.sourceUrl} />
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent shrink-0" />
            </span>
          </div>
          <div className="text-[30px] font-[500] font-mono leading-none">
            {cpi.yoyChange != null ? `${cpi.yoyChange.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[13px] font-[400] text-muted mt-2">Year-over-year change</div>
          {cpi.value != null && (
            <div className="text-[11px] font-[400] text-muted mt-1" style={{ opacity: 0.7 }}>
              Index: {cpi.value.toFixed(1)}
            </div>
          )}
          {cpi.date && (
            <div className="text-[11px] font-[400] text-muted mt-1" style={{ opacity: 0.7 }}>
              {new Date(cpi.date).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </button>

        {/* M2 Money Supply */}
        <button
          type="button"
          onClick={() => setSelectedMacro("m2")}
          className="rounded-lg bg-card p-4 text-left w-full hover:bg-card-hover transition-colors cursor-pointer group"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-[400] text-muted flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-accent" />
              M2 Money Supply
            </span>
            <span className="flex items-center gap-1">
              <FredSourceLink href={m2.sourceUrl} />
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent shrink-0" />
            </span>
          </div>
          <div className="text-[30px] font-[500] font-mono leading-none">
            {m2.value != null
              ? `$${(m2.value / 1000).toFixed(1)}T`
              : "—"}
          </div>
          {m2.yoyChange != null && (
            <div className="flex items-center gap-1 mt-2">
              {m2.yoyChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red" />
              )}
              <span
                className={`text-[13px] font-[400] font-mono ${
                  m2.yoyChange >= 0 ? "text-green" : "text-red"
                }`}
              >
                {m2.yoyChange >= 0 ? "+" : ""}
                {m2.yoyChange.toFixed(1)}% YoY
              </span>
            </div>
          )}
          {m2.date && (
            <div className="text-[11px] font-[400] text-muted mt-2" style={{ opacity: 0.7 }}>
              {new Date(m2.date).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </button>

        {/* Business Cycle */}
        <button
          type="button"
          onClick={() => setSelectedMacro("businessCycle")}
          className="rounded-lg bg-card p-4 text-left w-full hover:bg-card-hover transition-colors cursor-pointer group"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-[400] text-muted flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              Business Cycle
            </span>
            <span className="flex items-center gap-1">
              <FredSourceLink href={businessCycle.sourceUrl} />
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent shrink-0" />
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[30px] font-[500] leading-none ${
                businessCycle.inRecession ? "text-red" : "text-green"
              }`}
            >
              {businessCycle.inRecession ? "Recession" : "Expansion"}
            </span>
          </div>
          {businessCycle.recessionProbability != null && (
            <>
              <div className="flex items-center justify-between text-[13px] font-[400] mb-1">
                <span className="text-muted flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Recession probability
                </span>
                <span className="font-mono">
                  {businessCycle.recessionProbability.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-card-hover overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    businessCycle.recessionProbability > 50
                      ? "bg-red"
                      : businessCycle.recessionProbability > 20
                        ? "bg-accent"
                        : "bg-green"
                  }`}
                  style={{
                    width: `${Math.min(businessCycle.recessionProbability, 100)}%`,
                  }}
                />
              </div>
            </>
          )}
          {businessCycle.date && (
            <div className="text-[11px] font-[400] text-muted mt-2" style={{ opacity: 0.7 }}>
              {new Date(businessCycle.date).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </button>

        {/* Manufacturing Confidence (PMI proxy) */}
        <button
          type="button"
          onClick={() => setSelectedMacro("ism")}
          className="rounded-lg bg-card p-4 text-left w-full hover:bg-card-hover transition-colors cursor-pointer group"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-[400] text-muted flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5 text-accent" />
              Mfg. Confidence (PMI)
            </span>
            <span className="flex items-center gap-1">
              <FredSourceLink href={ismMfg.sourceUrl} />
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent shrink-0" />
            </span>
          </div>
          <div className="text-[30px] font-[500] font-mono leading-none">
            {ismMfg.value != null ? ismMfg.value.toFixed(1) : "—"}
          </div>
          {ismMfg.value != null && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`text-[13px] font-[400] font-mono ${
                  ismMfg.value >= 0 ? "text-green" : "text-red"
                }`}
              >
                {ismMfg.value >= 0 ? "Expanding" : "Contracting"}
              </span>
              {ismMfg.change != null && (
                <span
                  className={`inline-flex items-center gap-1 text-[13px] font-[400] font-mono ${
                    ismMfg.change >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {ismMfg.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {ismMfg.change >= 0 ? "+" : ""}
                  {ismMfg.change.toFixed(1)} pts
                </span>
              )}
            </div>
          )}
          <div className="text-[11px] font-[400] text-muted mt-2" style={{ opacity: 0.7 }}>
            OECD · 0 = neutral · &gt;0 expansion
            {ismMfg.date &&
              ` · ${new Date(ismMfg.date).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}`}
          </div>
        </button>

        {/* Consumer Sentiment */}
        <button
          type="button"
          onClick={() => setSelectedMacro("sentiment")}
          className="rounded-lg bg-card p-4 text-left w-full hover:bg-card-hover transition-colors cursor-pointer group"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-[400] text-muted flex items-center gap-1.5">
              <Handshake className="h-3.5 w-3.5 text-accent" />
              Consumer Sentiment
            </span>
            <span className="flex items-center gap-1">
              <FredSourceLink href={sentiment.sourceUrl} />
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent shrink-0" />
            </span>
          </div>
          <div className="text-[30px] font-[500] font-mono leading-none">
            {sentiment.value != null ? sentiment.value.toFixed(1) : "—"}
          </div>
          {sentiment.value != null && sentiment.change != null && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-[13px] font-[400] font-mono ${
                  sentiment.change >= 0 ? "text-green" : "text-red"
                }`}
              >
                {sentiment.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {sentiment.change >= 0 ? "+" : ""}
                {sentiment.change.toFixed(1)} pts
              </span>
            </div>
          )}
          <div className="text-[11px] font-[400] text-muted mt-2" style={{ opacity: 0.7 }}>
            UMich index · avg ≈ 85
            {sentiment.date &&
              ` · ${new Date(sentiment.date).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}`}
          </div>
        </button>
      </div>

      {/* Modal: macro description */}
      {selectedContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedMacro(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="macro-modal-title"
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 id="macro-modal-title" className="text-lg font-semibold text-foreground">
                {selectedContent.title}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedMacro(null)}
                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-sm">
              <div>
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">What it is</h3>
                <p className="text-foreground/90 leading-relaxed">{selectedContent.whatItIs}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">How it works</h3>
                <p className="text-foreground/90 leading-relaxed">{selectedContent.howItWorks}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">Investing impact</h3>
                <p className="text-foreground/90 leading-relaxed">{selectedContent.investingImpact}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

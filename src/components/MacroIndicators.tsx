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
} from "lucide-react";

interface MacroData {
  asOf: string;
  industrialProduction: {
    value: number | null;
    previous: number | null;
    change: number | null;
    yoyChange: number | null;
    date: string;
  };
  cpi: {
    value: number | null;
    yoyChange: number | null;
    date: string;
  };
  m2: {
    value: number | null;
    yoyChange: number | null;
    date: string;
  };
  businessCycle: {
    inRecession: boolean;
    recessionProbability: number | null;
    date: string;
  };
  ismManufacturing: {
    value: number | null;
    previous: number | null;
    change: number | null;
    date: string;
  };
  consumerSentiment: {
    value: number | null;
    previous: number | null;
    change: number | null;
    date: string;
  };
}

export default function MacroIndicators() {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-card border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-card border border-border p-5 text-center text-sm text-muted">
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Industrial Production */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted font-medium flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-accent" />
            Industrial Production
          </span>
        </div>
        <div className="text-2xl font-bold font-mono">
          {ip.value != null ? ip.value.toFixed(1) : "—"}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {ip.yoyChange != null && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono ${
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
              className={`text-xs font-mono ${
                ip.change >= 0 ? "text-green" : "text-red"
              }`}
            >
              {ip.change >= 0 ? "+" : ""}
              {ip.change.toFixed(2)} MoM
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted mt-2">
          Fed index (2017 = 100)
          {ip.date &&
            ` · ${new Date(ip.date).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}`}
        </div>
      </div>

      {/* CPI */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted font-medium flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            CPI (Inflation)
          </span>
        </div>
        <div className="text-2xl font-bold font-mono">
          {cpi.yoyChange != null ? `${cpi.yoyChange.toFixed(1)}%` : "—"}
        </div>
        <div className="text-xs text-muted mt-1">Year-over-year change</div>
        {cpi.value != null && (
          <div className="text-[10px] text-muted mt-1">
            Index: {cpi.value.toFixed(1)}
          </div>
        )}
        {cpi.date && (
          <div className="text-[10px] text-muted mt-1">
            {new Date(cpi.date).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      {/* M2 Money Supply */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted font-medium flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-accent" />
            M2 Money Supply
          </span>
        </div>
        <div className="text-2xl font-bold font-mono">
          {m2.value != null
            ? `$${(m2.value / 1000).toFixed(1)}T`
            : "—"}
        </div>
        {m2.yoyChange != null && (
          <div className="flex items-center gap-1 mt-1">
            {m2.yoyChange >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red" />
            )}
            <span
              className={`text-xs font-mono ${
                m2.yoyChange >= 0 ? "text-green" : "text-red"
              }`}
            >
              {m2.yoyChange >= 0 ? "+" : ""}
              {m2.yoyChange.toFixed(1)}% YoY
            </span>
          </div>
        )}
        {m2.date && (
          <div className="text-[10px] text-muted mt-2">
            {new Date(m2.date).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      {/* Business Cycle */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted font-medium flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-accent" />
            Business Cycle
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-sm font-semibold px-2 py-1 rounded ${
              businessCycle.inRecession
                ? "bg-red/15 text-red"
                : "bg-green/15 text-green"
            }`}
          >
            {businessCycle.inRecession ? "Recession" : "Expansion"}
          </span>
        </div>
        {businessCycle.recessionProbability != null && (
          <>
            <div className="flex items-center justify-between text-xs mb-1">
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
          <div className="text-[10px] text-muted mt-2">
            {new Date(businessCycle.date).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      {/* Manufacturing Confidence (PMI proxy) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted font-medium flex items-center gap-1.5">
            <Factory className="h-3.5 w-3.5 text-accent" />
            Mfg. Confidence (PMI)
          </span>
          <a
            href="https://tradingeconomics.com/united-states/business-confidence"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors"
            title="View on Trading Economics"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="text-2xl font-bold font-mono">
          {ismMfg.value != null ? ismMfg.value.toFixed(1) : "—"}
        </div>
        {ismMfg.value != null && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                ismMfg.value >= 0
                  ? "bg-green-500/15 text-green-500"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {ismMfg.value >= 0 ? "Expanding" : "Contracting"}
            </span>
            {ismMfg.change != null && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-mono ${
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
        <div className="text-[10px] text-muted mt-2">
          OECD · 0 = neutral · &gt;0 expansion
          {ismMfg.date &&
            ` · ${new Date(ismMfg.date).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}`}
        </div>
      </div>

      {/* Consumer Sentiment */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted font-medium flex items-center gap-1.5">
            <Handshake className="h-3.5 w-3.5 text-accent" />
            Consumer Sentiment
          </span>
          <a
            href="https://tradingeconomics.com/united-states/consumer-confidence"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors"
            title="View on Trading Economics"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="text-2xl font-bold font-mono">
          {sentiment.value != null ? sentiment.value.toFixed(1) : "—"}
        </div>
        {sentiment.value != null && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {sentiment.change != null && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-mono ${
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
            )}
          </div>
        )}
        <div className="text-[10px] text-muted mt-2">
          UMich index · avg ≈ 85
          {sentiment.date &&
            ` · ${new Date(sentiment.date).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}`}
        </div>
      </div>
    </div>
  );
}

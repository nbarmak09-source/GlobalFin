"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Briefcase,
  CandlestickChart,
  FileText,
  Filter,
  CalendarDays,
  PieChart,
  Bell,
  Calculator,
  Wand2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/PageHeader";
import type { EnrichedPosition } from "@/lib/types";

interface PortfolioSnapshot {
  totalValue: number;
  totalCost: number;
  dayChangePct: number;
  totalPLPct: number;
  positionCount: number;
}

interface AlertSnapshot {
  total: number;
  triggered: number;
}

const investingCards = [
  {
    href: "/portfolio",
    icon: Briefcase,
    label: "Portfolio",
    desc: "Track positions, P&L, and performance.",
  },
  {
    href: "/stocks",
    icon: CandlestickChart,
    label: "Stocks",
    desc: "Deep-dive into single-name fundamentals.",
  },
  {
    href: "/screener",
    icon: Filter,
    label: "Screener",
    desc: "Filter stocks by fundamentals and metrics.",
  },
  {
    href: "/allocation",
    icon: PieChart,
    label: "Allocation",
    desc: "Visualise sector and geographic exposure.",
  },
  {
    href: "/alerts",
    icon: Bell,
    label: "Price Alerts",
    desc: "Set targets and track price crossings.",
  },
  {
    href: "/calendar",
    icon: CalendarDays,
    label: "Calendar",
    desc: "Earnings and dividend dates for your holdings.",
  },
];

const toolCards = [
  {
    href: "/models",
    icon: Calculator,
    label: "Valuation Models",
    desc: "Build DCF, comps, and LBO valuation models.",
  },
  {
    href: "/filings",
    icon: FileText,
    label: "Filings AI",
    desc: "AI summaries of 10-K and 10-Q filings.",
  },
  {
    href: "/pitch",
    icon: Wand2,
    label: "Pitch Builder",
    desc: "Generate AI-powered investment memos.",
  },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function pct(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

const MASK = "••••";

export default function InvestingPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [alerts, setAlerts] = useState<AlertSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [valuesVisible, setValuesVisible] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("portfolio-values-visible") : null;
    if (stored !== null) setValuesVisible(stored === "true");
  }, []);

  function toggleValuesVisible() {
    setValuesVisible((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        localStorage.setItem("portfolio-values-visible", String(next));
      }
      return next;
    });
  }

  useEffect(() => {
    async function load() {
      try {
        const [posRes, alertRes] = await Promise.all([
          fetch("/api/portfolio", { credentials: "include" }),
          fetch("/api/alerts", { credentials: "include" }),
        ]);

        if (posRes.ok) {
          const positions: EnrichedPosition[] = await posRes.json();
          if (positions.length > 0) {
            const totalValue = positions.reduce(
              (s, p) => s + p.marketValue,
              0
            );
            const totalCost = positions.reduce(
              (s, p) => s + p.avgCost * p.shares,
              0
            );
            const dayChangeValue = positions.reduce(
              (s, p) => s + p.dayChange * p.shares,
              0
            );
            const prevValue = totalValue - dayChangeValue;
            setPortfolio({
              totalValue,
              totalCost,
              dayChangePct: prevValue > 0 ? (dayChangeValue / prevValue) * 100 : 0,
              totalPLPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
              positionCount: positions.length,
            });
          }
        }

        if (alertRes.ok) {
          const alertData = await alertRes.json();
          if (Array.isArray(alertData)) {
            setAlerts({
              total: alertData.length,
              triggered: alertData.filter(
                (a: { triggered: boolean }) => a.triggered
              ).length,
            });
          }
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Investing"
        subtitle="Your personal investing toolkit — portfolio, research, and alerts."
        action={
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={toggleValuesVisible}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
              title={valuesVisible ? "Hide values" : "Show values"}
            >
              <span>{valuesVisible ? "Hide values" : "Show values"}</span>
            </button>
            <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Investing hub</span>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Portfolio Value
          </p>
          {loading ? (
            <div className="h-8 w-32 rounded bg-card-hover animate-pulse" />
          ) : portfolio ? (
            <>
              <p className="text-2xl font-bold tabular-nums">
                {valuesVisible ? fmt(portfolio.totalValue) : MASK}
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span
                  className={`flex items-center gap-0.5 ${portfolio.dayChangePct >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {portfolio.dayChangePct >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {pct(portfolio.dayChangePct)} today
                </span>
                <span className="text-muted">
                  {portfolio.positionCount} position
                  {portfolio.positionCount !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No positions yet</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Total Return
          </p>
          {loading ? (
            <div className="h-8 w-24 rounded bg-card-hover animate-pulse" />
          ) : portfolio ? (
            <>
              <p
                className={`text-2xl font-bold tabular-nums ${portfolio.totalPLPct >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {pct(portfolio.totalPLPct)}
              </p>
              <p className="text-xs text-muted">
                {valuesVisible ? fmt(portfolio.totalValue - portfolio.totalCost) : MASK} P&L
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Price Alerts
          </p>
          {loading ? (
            <div className="h-8 w-20 rounded bg-card-hover animate-pulse" />
          ) : alerts && alerts.total > 0 ? (
            <>
              <p className="text-2xl font-bold tabular-nums">
                {alerts.triggered}
                <span className="text-base font-normal text-muted">
                  {" "}
                  / {alerts.total}
                </span>
              </p>
              <p className="text-xs text-muted">triggered</p>
            </>
          ) : (
            <p className="text-sm text-muted">No alerts set</p>
          )}
        </div>
      </section>

      <section className="space-y-0">
        <SectionHeading>At a glance</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-1">
          {investingCards.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-border bg-card p-5 hover:bg-card-hover transition-colors"
            >
              <Icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm font-semibold">{label}</h3>
              <p className="mt-1 text-xs text-muted">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-0">
        <SectionHeading>Analysis</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-1">
          {toolCards.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-border bg-card p-5 hover:bg-card-hover transition-colors"
            >
              <Icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm font-semibold">{label}</h3>
              <p className="mt-1 text-xs text-muted">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

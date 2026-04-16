"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

type CalendarEvent = {
  symbol: string;
  companyName: string;
  type: "earnings" | "dividend";
  date: string;
  detail: string;
  callTime?: "BMO" | "AMC";
};

const UPCOMING_DAYS = 30;
const MAX_CARDS = 8;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isEarningsInWindow(isoDate: string): boolean {
  const t = new Date(isoDate + "T12:00:00");
  if (Number.isNaN(t.getTime())) return false;
  const start = startOfToday();
  const end = new Date(start);
  end.setDate(end.getDate() + UPCOMING_DAYS);
  end.setHours(23, 59, 59, 999);
  return t >= start && t <= end;
}

function formatReportDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Upcoming earnings for all portfolio positions (across portfolios), via `/api/calendar?scope=holdings`.
 */
export default function PortfolioEarningsUpcoming() {
  const [items, setItems] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/calendar?scope=holdings", {
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setItems([]);
          return;
        }
        const json: CalendarEvent[] = await res.json();
        if (cancelled) return;
        const earnings = json
          .filter((e) => e.type === "earnings" && isEarningsInWindow(e.date))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, MAX_CARDS);
        setItems(earnings);
      } catch {
        if (!cancelled) setItems([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null || items.length === 0) return null;

  return (
    <section className="space-y-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Upcoming earnings (your holdings)
        </h2>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Full calendar
        </Link>
      </div>
      <p className="text-xs text-muted -mt-1">
        Next {UPCOMING_DAYS} days · all positions across portfolios
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {items.map((e) => (
          <Link
            key={`${e.symbol}-${e.date}`}
            href={`/stocks?symbol=${encodeURIComponent(e.symbol)}`}
            scroll={false}
            className="shrink-0 w-[min(200px,72vw)] rounded-xl border border-border bg-card p-3 hover:bg-card-hover hover:border-accent/40 transition-colors cursor-pointer"
          >
            <div className="font-mono text-sm font-semibold text-accent">{e.symbol}</div>
            <div className="text-xs text-muted truncate mt-0.5" title={e.companyName}>
              {e.companyName}
            </div>
            <div className="text-[11px] font-mono text-muted/90 mt-2">{formatReportDate(e.date)}</div>
            {e.callTime ? (
              <span className="inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wide rounded px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20">
                {e.callTime}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

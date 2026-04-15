"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CalendarEvent = {
  symbol: string;
  companyName: string;
  type: "earnings" | "dividend";
  date: string;
  detail: string;
  callTime?: "BMO" | "AMC";
};

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const x = new Date(d);
  x.setDate(d.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const mon = startOfWeekMonday(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function isEarningsThisWeek(isoDate: string, now: Date): boolean {
  const t = new Date(isoDate + "T12:00:00");
  if (Number.isNaN(t.getTime())) return false;
  const a = startOfWeekMonday(now);
  const b = endOfWeekSunday(now);
  return t >= a && t <= b;
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

export default function StocksEarningsThisWeek() {
  const [items, setItems] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/calendar?scope=all", { credentials: "same-origin" });
        if (!res.ok) {
          if (!cancelled) setItems([]);
          return;
        }
        const json: CalendarEvent[] = await res.json();
        if (cancelled) return;
        const now = new Date();
        const earnings = json
          .filter((e) => e.type === "earnings" && isEarningsThisWeek(e.date, now))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 8);
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
      <h2 className="text-sm font-semibold text-foreground">Earnings this week</h2>
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

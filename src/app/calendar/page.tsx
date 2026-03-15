"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  RefreshCw,
  TrendingUp,
  DollarSign,
} from "lucide-react";

interface CalendarEvent {
  symbol: string;
  companyName: string;
  type: "earnings" | "dividend";
  date: string;
  detail: string;
}

type Scope = "holdings" | "watchlist" | "all";

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff <= 7) return `In ${diff} days`;
  if (diff < 0 && diff >= -7) return `${Math.abs(diff)} days ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupByDate(events: CalendarEvent[]) {
  const groups = new Map<string, CalendarEvent[]>();
  events.forEach((e) => {
    const arr = groups.get(e.date) || [];
    arr.push(e);
    groups.set(e.date, arr);
  });
  return Array.from(groups.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("holdings");

  async function load(s: Scope) {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?scope=${s}`, {
        credentials: "include",
      });
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const grouped = groupByDate(events);

  return (
    <div className="space-y-8 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Earnings &amp; Dividends Calendar
          </h1>
          <p className="text-sm text-muted">
            Upcoming corporate events for your holdings and watchlist.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(scope)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent hover:bg-accent/20 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </header>

      <div className="flex gap-2">
        {(["holdings", "watchlist", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === s
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {s === "holdings"
              ? "My Holdings"
              : s === "watchlist"
                ? "My Watchlist"
                : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-16 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <CalendarDays className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            {scope === "holdings"
              ? "No upcoming events for your holdings."
              : scope === "watchlist"
                ? "No upcoming events for your watchlist."
                : "No upcoming events found."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dateEvents]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold">{relativeDate(date)}</h3>
                <span className="text-xs text-muted">{date}</span>
              </div>
              <div className="space-y-2">
                {dateEvents.map((ev, i) => (
                  <div
                    key={`${ev.symbol}-${ev.type}-${i}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-card-hover transition-colors"
                  >
                    <div
                      className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                        ev.type === "earnings"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {ev.type === "earnings" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <DollarSign className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stocks?symbol=${ev.symbol}`}
                          className="text-sm font-medium hover:text-accent transition-colors"
                        >
                          {ev.symbol}
                        </Link>
                        <span className="text-xs text-muted truncate">
                          {ev.companyName}
                        </span>
                      </div>
                      {ev.detail && (
                        <p className="text-xs text-muted mt-0.5">
                          {ev.detail}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        ev.type === "earnings"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {ev.type === "earnings" ? "Earnings" : "Dividend"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

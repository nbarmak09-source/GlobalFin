"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Download,
  Sunrise,
  Moon,
  Search,
} from "lucide-react";
import type { EarningsEvent } from "@/app/api/fmp/earnings-calendar/route";

// ─── Date helpers ────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

type FilterKey = "yesterday" | "today" | "tomorrow" | "this-week" | "next-week";

function getDateRange(filter: FilterKey): { from: string; to: string; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const iso = toIso(d);
    return { from: iso, to: iso, label: formatShort(d) };
  }
  if (filter === "today") {
    const iso = toIso(today);
    return { from: iso, to: iso, label: formatShort(today) };
  }
  if (filter === "tomorrow") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    const iso = toIso(d);
    return { from: iso, to: iso, label: formatShort(d) };
  }
  if (filter === "this-week") {
    const mon = getMonday(today);
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    return { from: toIso(mon), to: toIso(fri), label: `W${isoWeekNumber(today)}` };
  }
  // next-week
  const mon = getMonday(today);
  mon.setDate(mon.getDate() + 7);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return { from: toIso(mon), to: toIso(fri), label: `W${isoWeekNumber(mon)}` };
}

function formatShort(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtMoney(v: number | null): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function fmtMarketCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
}

function fmtEps(v: number | null): string {
  if (v == null) return "—";
  return v >= 0 ? `$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`;
}

// ─── Logo with letter-avatar fallback ────────────────────────────────────────

function CompanyLogo({ symbol, name }: { symbol: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const domain = `${symbol.toLowerCase()}.com`;
  const letter = (name?.[0] ?? symbol?.[0] ?? "?").toUpperCase();

  if (failed) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-card border border-border text-[9px] font-bold text-muted shrink-0">
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={symbol}
      width={20}
      height={20}
      className="rounded-sm object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          <td className="py-3 px-3">
            <div className="h-5 w-16 animate-pulse rounded bg-card/60" />
          </td>
          <td className="py-3 px-3 hidden md:table-cell">
            <div className="h-4 w-32 animate-pulse rounded bg-card/60" />
          </td>
          <td className="py-3 px-3">
            <div className="h-4 w-16 animate-pulse rounded bg-card/60" />
          </td>
          <td className="py-3 px-3">
            <div className="h-4 w-10 animate-pulse rounded bg-card/60" />
          </td>
          <td className="py-3 px-3 hidden md:table-cell">
            <div className="h-4 w-14 animate-pulse rounded bg-card/60" />
          </td>
          <td className="py-3 px-3">
            <div className="h-5 w-20 animate-pulse rounded bg-card/60" />
          </td>
          <td className="py-3 px-3">
            <div className="h-5 w-16 animate-pulse rounded bg-card/60" />
          </td>
          <td className="py-3 px-3">
            <div className="h-4 w-16 animate-pulse rounded bg-card/60" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── vs-estimate pill ─────────────────────────────────────────────────────────

function VsEstPill({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const beat = pct >= 0;
  return (
    <span
      className={`inline-block rounded px-1 py-0.5 text-[9px] font-medium tabular-nums ${
        beat
          ? "bg-green-500/10 text-green-500"
          : "bg-red-500/10 text-red-500"
      }`}
    >
      {beat ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  sublabel: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, sublabel, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-xl border px-4 py-3 text-center transition-colors cursor-pointer ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-card text-muted hover:text-foreground hover:border-border/80"
      }`}
    >
      <span className="flex items-center gap-1 text-[12px] font-medium">
        <CalendarDays className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-[11px] opacity-70">{sublabel}</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "yesterday", label: "Yesterday" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "this-week", label: "This Week" },
  { key: "next-week", label: "Next Week" },
];

export default function EarningsCalendar() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("today");
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const dateRanges = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, getDateRange(f.key)])) as Record<FilterKey, ReturnType<typeof getDateRange>>,
    []
  );

  useEffect(() => {
    const { from, to } = dateRanges[activeFilter];
    setLoading(true);
    setEvents([]);

    fetch(`/api/fmp/earnings-calendar?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EarningsEvent[]) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [activeFilter, dateRanges]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.trim().toUpperCase();
    return events.filter(
      (e) =>
        e.symbol.includes(q) ||
        e.companyName.toUpperCase().includes(q)
    );
  }, [events, searchQuery]);

  const { from, to } = dateRanges[activeFilter];

  return (
    <div className="space-y-4">
      {/* Search row */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search companies by name or ticker"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Date filter chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            sublabel={dateRanges[f.key].label}
            active={activeFilter === f.key}
            onClick={() => setActiveFilter(f.key)}
          />
        ))}
      </div>

      {/* Data-lag notice */}
      {activeFilter === "today" && (
        <p className="text-[11px] text-muted italic">
          Results for today typically appear the following morning once FMP processes and publishes confirmed filings.
        </p>
      )}
      {activeFilter === "tomorrow" && (
        <p className="text-[11px] text-muted italic">
          Scheduled earnings for future dates appear once FMP confirms and publishes each filing — usually by the morning after reporting.
        </p>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[12px] text-muted hover:text-foreground hover:border-border/80 transition-colors cursor-pointer"
          title="Download CSV"
          // TODO: implement CSV download
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <span className="text-[11px] text-muted">
          {loading ? "Loading…" : `${filtered.length} compan${filtered.length === 1 ? "y" : "ies"}`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted w-24">Ticker</th>
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted hidden md:table-cell">Company</th>
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted w-20">Date</th>
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted w-16">Time</th>
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted w-20 hidden md:table-cell">Qtr Ending</th>
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted w-28">Revenue</th>
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted w-24">EPS</th>
              <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted w-24">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <CalendarDays className="h-10 w-10 opacity-20" />
                    <p className="text-[13px] font-medium text-foreground">No earnings scheduled</p>
                    <p className="text-[12px] text-muted">
                      {from === to ? from : `${from} – ${to}`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((ev) => (
                <tr
                  key={`${ev.symbol}-${ev.date}`}
                  className="border-b border-border/50 last:border-0 hover:bg-card/40 cursor-pointer transition-colors"
                  onClick={() => router.push(`/analysis?symbol=${ev.symbol}`)}
                >
                  {/* Ticker */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <CompanyLogo symbol={ev.symbol} name={ev.companyName} />
                      <span className="font-semibold text-[12px] text-foreground tabular-nums">
                        {ev.symbol}
                      </span>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="py-3 px-3 hidden md:table-cell max-w-[160px]">
                    <span className="block truncate text-[12px] text-muted">
                      {ev.companyName}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3">
                    <span className="text-[12px] font-mono text-foreground">{ev.date}</span>
                  </td>

                  {/* Time */}
                  <td className="py-3 px-3">
                    {ev.time === "bmo" ? (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400">
                        <Sunrise className="h-3.5 w-3.5" />
                        BMO
                      </span>
                    ) : ev.time === "amc" ? (
                      <span className="flex items-center gap-1 text-[11px] text-blue-400">
                        <Moon className="h-3.5 w-3.5" />
                        AMC
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted">—</span>
                    )}
                  </td>

                  {/* Qtr Ending */}
                  <td className="py-3 px-3 hidden md:table-cell">
                    <span className="text-[11px] text-muted">{ev.fiscalDateEnding || "—"}</span>
                  </td>

                  {/* Revenue */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] text-foreground tabular-nums">
                        {fmtMoney(ev.revenue)}
                      </span>
                      {ev.revenueEstimated != null && (
                        <span className="text-[10px] text-muted tabular-nums">
                          est. {fmtMoney(ev.revenueEstimated)}
                        </span>
                      )}
                      <VsEstPill pct={ev.revenueVsEstimate} />
                    </div>
                  </td>

                  {/* EPS */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] text-foreground tabular-nums">
                        {fmtEps(ev.eps)}
                      </span>
                      {ev.epsEstimated != null && (
                        <span className="text-[10px] text-muted tabular-nums">
                          est. {fmtEps(ev.epsEstimated)}
                        </span>
                      )}
                      <VsEstPill pct={ev.epsVsEstimate} />
                    </div>
                  </td>

                  {/* Market Cap */}
                  <td className="py-3 px-3">
                    <span className="text-[12px] text-muted tabular-nums">
                      {fmtMarketCap(ev.marketCap)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

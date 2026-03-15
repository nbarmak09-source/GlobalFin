"use client";

import { useState, useEffect, useMemo } from "react";
import type { SECFinancials } from "@/lib/types";
import {
  Loader2,
  ExternalLink,
  FileText,
  Filter,
} from "lucide-react";

interface Filing {
  form: string;
  filingDate: string;
  description: string;
  accessionNumber: string;
  primaryDocument: string;
  url: string;
}

interface FilingsResponse {
  symbol: string;
  cik: string;
  companyName: string;
  filings: Filing[];
}

const FORM_COLORS: Record<string, string> = {
  "10-K": "bg-blue-500/15 text-blue-400",
  "10-Q": "bg-cyan-500/15 text-cyan-400",
  "8-K": "bg-amber-500/15 text-amber-400",
  "DEF 14A": "bg-purple-500/15 text-purple-400",
  "4": "bg-green-500/15 text-green-400",
  "S-1": "bg-rose-500/15 text-rose-400",
};

const FORM_LABELS: Record<string, string> = {
  "10-K": "Annual Report",
  "10-K/A": "Annual Report (Amended)",
  "10-Q": "Quarterly Report",
  "10-Q/A": "Quarterly Report (Amended)",
  "8-K": "Current Report",
  "8-K/A": "Current Report (Amended)",
  "DEF 14A": "Proxy Statement",
  "S-1": "Registration Statement",
  "S-1/A": "Registration (Amended)",
  "20-F": "Annual Report (Foreign)",
  "6-K": "Report (Foreign)",
  "4": "Insider Transaction",
  "SC 13D": "Beneficial Ownership",
  "SC 13G": "Beneficial Ownership",
  "13F-HR": "Institutional Holdings",
};

const FILTER_OPTIONS = [
  "All",
  "10-K",
  "10-Q",
  "8-K",
  "Insider (4)",
  "Other",
] as const;

function formatLarge(value: number): string {
  if (!value) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

export default function SECFilingsTab({ symbol }: { symbol: string }) {
  const [filings, setFilings] = useState<FilingsResponse | null>(null);
  const [secData, setSecData] = useState<SECFinancials | null>(null);
  const [loadingFilings, setLoadingFilings] = useState(true);
  const [loadingSec, setLoadingSec] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTER_OPTIONS)[number]>("All");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingFilings(true);
      setLoadingSec(true);
      try {
        const [filingsRes, secRes] = await Promise.all([
          fetch(
            `/api/sec-filings?symbol=${encodeURIComponent(symbol)}`,
          ),
          fetch(
            `/api/sec-financials?symbol=${encodeURIComponent(symbol)}`,
          ),
        ]);
        if (!cancelled && filingsRes.ok) {
          setFilings(await filingsRes.json());
        }
        if (!cancelled && secRes.ok) {
          setSecData(await secRes.json());
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) {
          setLoadingFilings(false);
          setLoadingSec(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const filteredFilings = useMemo(() => {
    if (!filings) return [];
    if (filter === "All") return filings.filings;
    if (filter === "Insider (4)")
      return filings.filings.filter((f) => f.form === "4");
    if (filter === "Other")
      return filings.filings.filter(
        (f) =>
          !["10-K", "10-Q", "8-K", "4"].includes(f.form) &&
          !f.form.endsWith("/A"),
      );
    return filings.filings.filter(
      (f) => f.form === filter || f.form === filter + "/A",
    );
  }, [filings, filter]);

  const historicalRows = secData?.annualData
    ? [...secData.annualData].sort(
        (a, b) => Number(a.fiscalYear) - Number(b.fiscalYear),
      )
    : [];

  const loading = loadingFilings || loadingSec;

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span className="text-muted text-sm">Loading SEC data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Historical Financials from SEC XBRL */}
      {historicalRows.length > 0 && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-card-hover flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Historical Financials (SEC EDGAR)
            </h3>
            {secData?.cik && (
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${secData.cik}&type=10-K&dateb=&owner=include&count=10`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                View on EDGAR
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="px-4 py-2 font-medium min-w-[170px]">
                    Metric
                  </th>
                  {historicalRows.map((r) => (
                    <th
                      key={r.fiscalYear}
                      className="px-4 py-2 font-medium text-right min-w-[100px]"
                    >
                      FY {r.fiscalYear}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { label: "Revenue", key: "revenue" },
                    { label: "Operating Cash Flow", key: "operatingCashflow" },
                    { label: "CapEx", key: "capex" },
                    { label: "D&A", key: "depreciation" },
                    { label: "Current Assets", key: "currentAssets" },
                    { label: "Current Liabilities", key: "currentLiabilities" },
                    { label: "Working Capital", key: "workingCapital" },
                  ] as const
                ).map(({ label, key }) => (
                  <tr key={key} className="border-b border-border/30">
                    <td className="px-4 py-2 font-medium">{label}</td>
                    {historicalRows.map((r) => (
                      <td
                        key={r.fiscalYear}
                        className="px-4 py-2 text-right tabular-nums"
                      >
                        {r[key] != null ? formatLarge(r[key]!) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Filings */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-card-hover flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">
            Recent SEC Filings
            {filings?.companyName && (
              <span className="text-muted font-normal ml-2">
                — {filings.companyName}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted" />
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  filter === opt
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {!filings || filteredFilings.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted text-sm">
            {!filings
              ? "SEC filing data unavailable for this symbol."
              : "No filings match the selected filter."}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredFilings.map((f, i) => {
              const baseForm = f.form.replace(/\/A$/, "");
              const colorCls =
                FORM_COLORS[baseForm] || "bg-muted/15 text-muted";
              const label = FORM_LABELS[f.form] || f.form;

              return (
                <a
                  key={f.accessionNumber + i}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover transition-colors group"
                >
                  <div
                    className={`flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold min-w-[70px] ${colorCls}`}
                  >
                    {f.form}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {f.description || label}
                    </p>
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted tabular-nums">
                      {new Date(f.filingDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted group-hover:text-accent transition-colors" />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Helpful links */}
      {filings?.cik && (
        <div className="flex flex-wrap gap-3 text-xs">
          <a
            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filings.cik}&type=&dateb=&owner=include&count=40`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-card-hover transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-accent" />
            All EDGAR Filings
            <ExternalLink className="h-3 w-3 text-muted" />
          </a>
          <a
            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filings.cik}&type=10-K&dateb=&owner=include&count=10`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-card-hover transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-accent" />
            Annual Reports (10-K)
            <ExternalLink className="h-3 w-3 text-muted" />
          </a>
          <a
            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filings.cik}&type=DEF+14A&dateb=&owner=include&count=10`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-card-hover transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-accent" />
            Proxy Statements
            <ExternalLink className="h-3 w-3 text-muted" />
          </a>
        </div>
      )}
    </div>
  );
}

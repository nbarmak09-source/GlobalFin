"use client";

import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";

import FilingSummaryView from "@/components/FilingSummaryView";
import type { FilingSummary } from "@/lib/filingSummary";

type FilingFormType = "10-K" | "10-Q";

type SourceMode = "edgar" | "upload";

export default function FilingsPage() {
  const [mode, setMode] = useState<SourceMode>("edgar");
  const [symbol, setSymbol] = useState("");
  const [formType, setFormType] = useState<FilingFormType>("10-K");
  const [year, setYear] = useState<string>("");
  const [quarter, setQuarter] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadFilingType, setUploadFilingType] =
    useState<FilingFormType>("10-K");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FilingSummary | null>(null);

  async function handleGenerate() {
    setError(null);
    setSummary(null);
    setLoading(true);

    try {
      if (mode === "edgar") {
        const trimmedSymbol = symbol.trim().toUpperCase();
        if (!trimmedSymbol) {
          setError("Please enter a ticker symbol.");
          setLoading(false);
          return;
        }

        const payload: any = {
          source: {
            kind: "edgar" as const,
            symbol: trimmedSymbol,
            formType,
          },
        };

        if (year) {
          const y = Number(year);
          if (!Number.isFinite(y)) {
            setError("Year must be a number.");
            setLoading(false);
            return;
          }
          payload.source.year = y;
        }

        if (quarter) {
          const q = Number(quarter);
          if (![1, 2, 3, 4].includes(q)) {
            setError("Quarter must be 1–4.");
            setLoading(false);
            return;
          }
          payload.source.quarter = q as 1 | 2 | 3 | 4;
        }

        const res = await fetch("/api/filings/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(
            body?.error || "Failed to summarize filing from EDGAR. Please try again.",
          );
          setLoading(false);
          return;
        }

        const data = (await res.json()) as FilingSummary;
        setSummary(data);
      } else {
        if (!file) {
          setError("Please choose a file to upload.");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("filingType", uploadFilingType);
        if (symbol.trim()) formData.append("symbol", symbol.trim().toUpperCase());

        const res = await fetch("/api/filings/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(
            body?.error ||
              "Failed to process uploaded filing. Please ensure the file is a supported format.",
          );
          setLoading(false);
          return;
        }

        const data = (await res.json()) as FilingSummary;
        setSummary(data);
      }
    } catch (err) {
      console.error("Filings summary error:", err);
      setError("Unexpected error while summarizing filing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">
            SEC Filings Summaries
          </h1>
          <p className="text-sm text-muted">
            Generate AI summaries of 10-K and 10-Q filings using EDGAR or your
            own documents.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("edgar")}
            className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm ${
              mode === "edgar"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            Fetch from EDGAR
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm ${
              mode === "upload"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            Upload document
          </button>
        </div>

        {mode === "edgar" ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <label className="block text-xs text-muted mb-1">
                Ticker
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="AAPL"
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Form type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as FilingFormType)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
              >
                <option value="10-K">10-K (Annual)</option>
                <option value="10-Q">10-Q (Quarterly)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Year (optional)
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Quarter (optional, 1–4)
              </label>
              <input
                type="text"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                placeholder="1"
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 items-end">
            <div>
              <label className="block text-xs text-muted mb-1">
                Filing type
              </label>
              <select
                value={uploadFilingType}
                onChange={(e) =>
                  setUploadFilingType(e.target.value as FilingFormType)
                }
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
              >
                <option value="10-K">10-K (Annual)</option>
                <option value="10-Q">10-Q (Quarterly)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Ticker (optional)
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="AAPL"
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Filing file (TXT / HTML)
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs cursor-pointer hover:border-accent hover:bg-card-hover transition-colors">
                <input
                  type="file"
                  accept=".txt,.html,.htm"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                  }}
                />
                <Download className="h-4 w-4 text-muted" />
                <span className="truncate">
                  {file ? file.name : "Choose file…"}
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          {error && (
            <p className="text-xs text-red max-w-md whitespace-pre-line">
              {error}
            </p>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Summarizing…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate summary
              </>
            )}
          </button>
        </div>
      </section>

      {summary && (
        <section>
          <FilingSummaryView summary={summary} />
        </section>
      )}
    </div>
  );
}


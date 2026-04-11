"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  Save,
  Loader2,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  FolderOpen,
  FilePlus,
  TrendingUp,
  TrendingDown,
  Wand2,
  FileSpreadsheet,
  FileText,
  Printer,
  BarChart2,
  Users,
  Settings2,
  Star,
  ChevronUp,
} from "lucide-react";
import SymbolSearch from "@/components/SymbolSearch";
import type {
  QuoteSummaryData,
  StockPitch,
  PitchSections,
} from "@/lib/types";
import { PITCH_SECTION_META } from "@/lib/types";

const EMPTY_SECTIONS: PitchSections = {
  thesis: "",
  companyOverview: "",
  valuation: "",
  financials: "",
  catalysts: "",
  risks: "",
  recommendation: "",
};

const TEMPLATES = [
  { id: "default", label: "Standard", description: "Balanced long pitch" },
  { id: "growth", label: "Growth", description: "High-growth, momentum-focused" },
  { id: "value", label: "Value", description: "Discount to intrinsic value" },
  { id: "special_situations", label: "Special Sit.", description: "Event-driven opportunity" },
  { id: "short", label: "Short Thesis", description: "Bear case / sell thesis" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

interface DcfAssumptions {
  fcfGrowthRate: number;
  wacc: number;
  terminalGrowth: number;
}

interface PeerData {
  symbol: string;
  name: string;
  price: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  evToEbitda: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  returnOnEquity: number | null;
}

interface PitchScore {
  overall: number;
  thesis: number;
  valuation: number;
  financials: number;
  catalysts: number;
  risks: number;
  recommendation: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

function PitchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [stockData, setStockData] = useState<QuoteSummaryData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [sections, setSections] = useState<PitchSections>({ ...EMPTY_SECTIONS });
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [pitchId, setPitchId] = useState<string>("");
  const [savedPitches, setSavedPitches] = useState<StockPitch[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [showPitchList, setShowPitchList] = useState(false);
  const [loadingPitches, setLoadingPitches] = useState(false);
  // Template
  const [template, setTemplate] = useState<TemplateId>("default");
  // DCF assumptions
  const [dcfAssumptions, setDcfAssumptions] = useState<DcfAssumptions>({
    fcfGrowthRate: 10,
    wacc: 10,
    terminalGrowth: 2.5,
  });
  const [showDcfPanel, setShowDcfPanel] = useState(false);
  // Peer comps
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [showPeers, setShowPeers] = useState(false);
  const [customPeers, setCustomPeers] = useState("");
  // Pitch scoring
  const [score, setScore] = useState<PitchScore | null>(null);
  const [scoring, setScoring] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSavedPitches = useCallback(async () => {
    setLoadingPitches(true);
    try {
      const res = await fetch("/api/pitches");
      if (res.ok) setSavedPitches(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoadingPitches(false);
    }
  }, []);

  const fetchStockData = useCallback(async (sym: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/stocks?action=summary&symbol=${sym}`);
      if (res.ok) {
        const data: QuoteSummaryData = await res.json();
        setStockData(data);
        setCompanyName(data.longName || data.shortName || sym);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedPitches();
  }, [fetchSavedPitches]);

  useEffect(() => {
    const urlSymbol = searchParams.get("symbol")?.trim().toUpperCase();
    if (urlSymbol) {
      setSymbol(urlSymbol);
      fetchStockData(urlSymbol);
    }
  }, [searchParams, fetchStockData]);

  // Pre-fill DCF assumptions from live stock data when it loads
  useEffect(() => {
    if (!stockData) return;
    const growth = stockData.revenueGrowth != null
      ? Math.round(Math.min(stockData.revenueGrowth * 100, 40) * 10) / 10
      : 10;
    setDcfAssumptions((prev) => ({ ...prev, fcfGrowthRate: growth }));
  }, [stockData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPitchList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const pitchIdParam = searchParams.get("pitch");
    if (!pitchIdParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/pitches?id=${encodeURIComponent(pitchIdParam)}`
        );
        if (!res.ok || cancelled) return;
        const pitch: StockPitch = await res.json();
        if (cancelled) return;
        setPitchId(pitch.id);
        setSymbol(pitch.symbol);
        setCompanyName(pitch.companyName);
        setSections(pitch.sections);
        setShowPitchList(false);
        fetchStockData(pitch.symbol);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, fetchStockData]);

  function handleSymbolSelect(sym: string, name: string) {
    setSymbol(sym);
    setCompanyName(name);
    setSections({ ...EMPTY_SECTIONS });
    setPitchId(crypto.randomUUID());
    setStockData(null);
    fetchStockData(sym);
    router.replace(`/pitch?symbol=${encodeURIComponent(sym)}`, { scroll: false });
  }

  async function generateSection(sectionKey: string) {
    if (!stockData || generatingSection) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGeneratingSection(sectionKey);
    const existingContent = sections[sectionKey as keyof PitchSections];

    try {
      const res = await fetch("/api/pitch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: sectionKey,
          stockData,
          existingContent: existingContent || undefined,
          template: template !== "default" ? template : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setGeneratingSection(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                accumulated += parsed.text;
                setSections((prev) => ({
                  ...prev,
                  [sectionKey]: accumulated,
                }));
              }
            } catch {
              /* skip bad JSON */
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Generate error:", err);
      }
    } finally {
      setGeneratingSection(null);
      abortRef.current = null;
    }
  }

  async function generateFullPitch() {
    if (!stockData || generatingSection) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGeneratingSection("full");

    try {
      const res = await fetch("/api/pitch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "full",
          stockData,
          template: template !== "default" ? template : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setGeneratingSection(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                fullContent += parsed.text;
              }
            } catch {
              /* skip */
            }
          }
        }
      }

      parseFullPitchIntoSections(fullContent);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Generate full error:", err);
      }
    } finally {
      setGeneratingSection(null);
      abortRef.current = null;
    }
  }

  function parseFullPitchIntoSections(content: string) {
    const sectionHeaders: { key: keyof PitchSections; patterns: RegExp }[] = [
      { key: "thesis", patterns: /##\s*Investment\s*Thesis/i },
      { key: "companyOverview", patterns: /##\s*Company\s*Overview/i },
      { key: "valuation", patterns: /##\s*Valuation\s*Analysis/i },
      { key: "financials", patterns: /##\s*Financial\s*Highlights/i },
      { key: "catalysts", patterns: /##\s*Growth\s*Catalysts/i },
      { key: "risks", patterns: /##\s*Key\s*Risks/i },
      { key: "recommendation", patterns: /##\s*Price\s*Target/i },
    ];

    const parsed: PitchSections = { ...EMPTY_SECTIONS };
    const positions: { key: keyof PitchSections; index: number }[] = [];

    for (const { key, patterns } of sectionHeaders) {
      const match = content.match(patterns);
      if (match && match.index !== undefined) {
        positions.push({ key, index: match.index });
      }
    }

    positions.sort((a, b) => a.index - b.index);

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index;
      const end = i + 1 < positions.length ? positions[i + 1].index : content.length;
      let sectionContent = content.slice(start, end).trim();
      sectionContent = sectionContent.replace(/^##\s*.+\n+/, "").trim();
      parsed[positions[i].key] = sectionContent;
    }

    setSections(parsed);
  }

  async function handleSave() {
    if (!symbol) return;
    setSaving(true);
    try {
      const pitch: StockPitch = {
        id: pitchId,
        symbol,
        companyName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections,
      };
      const res = await fetch("/api/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pitch),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        fetchSavedPitches();
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  function loadPitch(pitch: StockPitch) {
    setPitchId(pitch.id);
    setSymbol(pitch.symbol);
    setCompanyName(pitch.companyName);
    setSections(pitch.sections);
    setShowPitchList(false);
    if (!stockData || stockData.symbol !== pitch.symbol) {
      fetchStockData(pitch.symbol);
    }
  }

  async function handleDeletePitch(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/pitches?id=${id}`, { method: "DELETE" });
    fetchSavedPitches();
    if (pitchId === id) {
      setPitchId(crypto.randomUUID());
      setSections({ ...EMPTY_SECTIONS });
    }
  }

  function handleNewPitch() {
    setSymbol("");
    setCompanyName("");
    setStockData(null);
    setSections({ ...EMPTY_SECTIONS });
    setPitchId(crypto.randomUUID());
    setShowPitchList(false);
    setPeers([]);
    setScore(null);
  }

  async function fetchPeers(sym: string, sector: string, custom = "") {
    setLoadingPeers(true);
    try {
      const params = new URLSearchParams({ symbol: sym, sector });
      if (custom.trim()) params.set("peers", custom.trim());
      const res = await fetch(`/api/pitch/peers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPeers(data.peers ?? []);
        setShowPeers(true);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingPeers(false);
    }
  }

  async function scorePitch() {
    if (!symbol || !Object.values(sections).some((s) => s.trim())) return;
    setScoring(true);
    setScore(null);
    try {
      const res = await fetch("/api/pitch/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, symbol, companyName }),
      });
      if (res.ok) {
        const data: PitchScore = await res.json();
        setScore(data);
        setShowScore(true);
      }
    } catch {
      /* silent */
    } finally {
      setScoring(false);
    }
  }

  function copyToClipboard() {
    const markdown = buildMarkdown();
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function exportExcel() {
    if (!stockData) return;
    setExportingExcel(true);
    try {
      const res = await fetch("/api/pitch/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockData, sections, dcfAssumptions, peers: peers.length > 0 ? peers : undefined }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${symbol}_pitch_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* silent */
    } finally {
      setExportingExcel(false);
    }
  }

  async function exportWord() {
    if (!stockData) return;
    setExportingWord(true);
    try {
      const res = await fetch("/api/pitch/export-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockData, sections }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${symbol}_pitch_${new Date().toISOString().slice(0, 10)}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* silent */
    } finally {
      setExportingWord(false);
    }
  }

  function printPitch() {
    // Build a hidden print-only DOM tree, then call window.print()
    const existing = document.getElementById("pitch-print-root");
    if (existing) existing.remove();

    const root = document.createElement("div");
    root.id = "pitch-print-root";
    root.style.display = "none";

    // Cover
    const cover = document.createElement("div");
    cover.className = "pitch-cover";
    cover.innerHTML = `
      <h1>${companyName} (${symbol})</h1>
      <h2>Investment Pitch</h2>
      <p style="color:#888;font-size:10pt;margin-top:1em">${stockData?.sector ?? ""} · ${stockData?.industry ?? ""}</p>
      <p style="color:#aaa;font-size:9pt;margin-top:0.5em">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    `;
    root.appendChild(cover);

    // Key stats table
    if (stockData) {
      const statsSection = document.createElement("div");
      statsSection.className = "pitch-section";
      statsSection.innerHTML = `<h3>Key Statistics</h3>`;
      const table = document.createElement("table");
      table.className = "pitch-stats-table";
      const rows = [
        ["Price", `$${stockData.regularMarketPrice?.toFixed(2) ?? "N/A"}`, "Market Cap", stockData.marketCap ? `$${(stockData.marketCap / 1e9).toFixed(2)}B` : "N/A"],
        ["Trailing P/E", stockData.trailingPE?.toFixed(1) ?? "N/A", "Forward P/E", stockData.forwardPE?.toFixed(1) ?? "N/A"],
        ["EV/EBITDA", stockData.enterpriseToEbitda?.toFixed(1) ?? "N/A", "Revenue", stockData.totalRevenue ? `$${(stockData.totalRevenue / 1e9).toFixed(2)}B` : "N/A"],
        ["Gross Margin", stockData.grossMargins != null ? `${(stockData.grossMargins * 100).toFixed(1)}%` : "N/A", "Op. Margin", stockData.operatingMargins != null ? `${(stockData.operatingMargins * 100).toFixed(1)}%` : "N/A"],
        ["Analyst Target", `$${stockData.targetMeanPrice?.toFixed(2) ?? "N/A"}`, "Recommendation", stockData.recommendationKey?.toUpperCase() ?? "N/A"],
      ];
      const thead = document.createElement("thead");
      thead.innerHTML = `<tr><th>Metric</th><th>Value</th><th>Metric</th><th>Value</th></tr>`;
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      for (const r of rows) {
        tbody.innerHTML += `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td><strong>${r[2]}</strong></td><td>${r[3]}</td></tr>`;
      }
      table.appendChild(tbody);
      statsSection.appendChild(table);
      root.appendChild(statsSection);
    }

    // Pitch sections
    for (const { key, label } of PITCH_SECTION_META) {
      const content = sections[key];
      if (!content?.trim()) continue;
      const sec = document.createElement("div");
      sec.className = "pitch-section";
      const h3 = document.createElement("h3");
      h3.textContent = label;
      sec.appendChild(h3);
      // Render markdown-ish lines
      const lines = content.split("\n");
      let currentUl: HTMLUListElement | null = null;
      for (const line of lines) {
        if (/^[-*]\s/.test(line)) {
          if (!currentUl) { currentUl = document.createElement("ul"); sec.appendChild(currentUl); }
          const li = document.createElement("li");
          li.innerHTML = line.replace(/^[-*]\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
          currentUl.appendChild(li);
        } else {
          currentUl = null;
          if (line.trim()) {
            const p = document.createElement("p");
            p.innerHTML = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/^#{1,6}\s+/, "");
            sec.appendChild(p);
          }
        }
      }
      root.appendChild(sec);
    }

    // Disclaimer
    const disc = document.createElement("div");
    disc.className = "pitch-disclaimer";
    disc.textContent = "This document is generated using AI-assisted analysis and live market data for informational purposes only. It does not constitute investment advice. Investors should conduct their own due diligence.";
    root.appendChild(disc);

    document.body.appendChild(root);
    window.print();
    setTimeout(() => root.remove(), 1000);
  }

  function buildMarkdown(): string {
    let md = `# ${companyName} (${symbol}) — Stock Pitch\n\n`;
    for (const { key, label } of PITCH_SECTION_META) {
      const content = sections[key];
      if (content) {
        md += `## ${label}\n\n${content}\n\n`;
      }
    }
    return md.trim();
  }

  function updateSection(key: keyof PitchSections, value: string) {
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  const hasContent = Object.values(sections).some((s) => s.trim().length > 0);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Pitch Builder</h1>
          <p className="text-sm text-muted">
            AI-powered stock pitch creation using live market data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setShowPitchList(!showPitchList);
                if (!showPitchList) fetchSavedPitches();
              }}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
            >
              <FolderOpen className="h-4 w-4" />
              Saved
              <ChevronDown className="h-3 w-3" />
            </button>
            {showPitchList && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <button
                    onClick={handleNewPitch}
                    className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-accent hover:bg-card-hover transition-colors"
                  >
                    <FilePlus className="h-4 w-4" />
                    New Pitch
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {loadingPitches ? (
                    <div className="p-4 text-center text-muted text-sm">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Loading...
                    </div>
                  ) : savedPitches.length === 0 ? (
                    <div className="p-4 text-center text-muted text-sm">
                      No saved pitches yet
                    </div>
                  ) : (
                    savedPitches.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => loadPitch(p)}
                        className={`flex items-center justify-between px-3 py-2.5 hover:bg-card-hover cursor-pointer transition-colors border-b border-border/30 last:border-0 ${
                          pitchId === p.id ? "bg-accent/10" : ""
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium">
                            <span className="text-accent">{p.symbol}</span>
                            <span className="text-muted ml-1.5 font-normal text-xs">
                              {p.companyName}
                            </span>
                          </div>
                          <div className="text-xs text-muted">
                            {new Date(p.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeletePitch(p.id, e)}
                          className="rounded p-1 text-muted hover:text-red hover:bg-red/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {hasContent && (
            <>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={exportWord}
                disabled={exportingWord || !stockData}
                title="Export to Word (.docx)"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors disabled:opacity-40"
              >
                {exportingWord ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {exportingWord ? "Exporting..." : "Word"}
              </button>
              <button
                onClick={exportExcel}
                disabled={exportingExcel || !stockData}
                title="Export financial model to Excel (.xlsx)"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors disabled:opacity-40"
              >
                {exportingExcel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                {exportingExcel ? "Exporting..." : "Excel"}
              </button>
              <button
                onClick={printPitch}
                title="Print / Save as PDF"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !symbol}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Symbol Search + Stock Header */}
      <div className="rounded-xl bg-card border border-border p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Select Stock
            </label>
            <SymbolSearch
              onSelect={(sym, name) => handleSymbolSelect(sym, name)}
              initialSymbol={symbol}
              placeholder="Search for a stock to pitch..."
            />
          </div>
          {stockData && (
            <div className="flex items-center gap-4 pb-1">
              <div>
                <div className="text-lg font-bold">{companyName}</div>
                <div className="text-xs text-muted">
                  {stockData.sector} · {stockData.industry}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono">
                  ${stockData.regularMarketPrice?.toFixed(2)}
                </div>
                <div
                  className={`text-sm font-mono flex items-center justify-end gap-1 ${
                    stockData.regularMarketChange >= 0
                      ? "text-green"
                      : "text-red"
                  }`}
                >
                  {stockData.regularMarketChange >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {stockData.regularMarketChange >= 0 ? "+" : ""}
                  {stockData.regularMarketChange?.toFixed(2)} (
                  {stockData.regularMarketChangePercent >= 0 ? "+" : ""}
                  {stockData.regularMarketChangePercent?.toFixed(2)}%)
                </div>
              </div>
            </div>
          )}
          {loadingData && (
            <div className="flex items-center gap-2 text-sm text-muted pb-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading stock data...
            </div>
          )}
        </div>
      </div>

      {/* Template Picker */}
      {stockData && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Template:</span>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              title={t.description}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                template === t.id
                  ? "bg-accent text-white border-accent"
                  : "border-border text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Generate Full Pitch Button */}
      {stockData && (
        <div className="mb-4">
          <button
            onClick={generateFullPitch}
            disabled={!!generatingSection}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-amber-700 px-6 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generatingSection === "full" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Full Pitch...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate Full Pitch with AI
                {template !== "default" && (
                  <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs">
                    {TEMPLATES.find((t) => t.id === template)?.label}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* Tooling Row: DCF, Peers, Score */}
      {stockData && (
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          {/* DCF Assumptions */}
          <button
            onClick={() => setShowDcfPanel((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${showDcfPanel ? "border-accent text-accent bg-accent/10" : "border-border text-muted hover:text-foreground hover:bg-card-hover"}`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            DCF Assumptions
            {showDcfPanel ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </button>
          {/* Peer Comps */}
          <button
            onClick={() => {
              if (!showPeers && peers.length === 0) {
                fetchPeers(symbol, stockData.sector ?? "", customPeers);
              } else {
                setShowPeers((v) => !v);
              }
            }}
            disabled={loadingPeers}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${showPeers ? "border-accent text-accent bg-accent/10" : "border-border text-muted hover:text-foreground hover:bg-card-hover"} disabled:opacity-40`}
          >
            {loadingPeers ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            Peer Comps
            {showPeers ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </button>
          {/* Pitch Score */}
          {hasContent && (
            <button
              onClick={scorePitch}
              disabled={scoring}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${showScore && score ? "border-accent text-accent bg-accent/10" : "border-border text-muted hover:text-foreground hover:bg-card-hover"} disabled:opacity-40`}
            >
              {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
              {scoring ? "Scoring..." : score ? `Score: ${score.overall}/100` : "Score Pitch"}
            </button>
          )}
          {/* Chart placeholder */}
          <div className="ml-auto text-xs text-muted flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            {symbol}
          </div>
        </div>
      )}

      {/* DCF Assumptions Panel */}
      {showDcfPanel && stockData && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-accent" />
            DCF Assumptions
            <span className="ml-auto text-xs text-muted font-normal">Used in Excel export</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "fcfGrowthRate" as const, label: "FCF Growth Rate (%)", min: 0, max: 50, step: 0.5 },
              { key: "wacc" as const, label: "WACC (%)", min: 4, max: 20, step: 0.5 },
              { key: "terminalGrowth" as const, label: "Terminal Growth (%)", min: 0, max: 5, step: 0.25 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key}>
                <label className="block text-xs text-muted mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={dcfAssumptions[key]}
                    onChange={(e) => setDcfAssumptions((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-sm font-mono w-12 text-right">{dcfAssumptions[key].toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peer Comparables Panel */}
      {showPeers && peers.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card-hover/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              Peer Comparables
            </h3>
            <div className="flex items-center gap-2">
              <input
                value={customPeers}
                onChange={(e) => setCustomPeers(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fetchPeers(symbol, stockData?.sector ?? "", customPeers); }}
                placeholder="Custom peers: AAPL,MSFT,..."
                className="rounded-lg bg-background border border-border px-3 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-48"
              />
              <button
                onClick={() => fetchPeers(symbol, stockData?.sector ?? "", customPeers)}
                disabled={loadingPeers}
                className="rounded-lg bg-accent/10 text-accent px-3 py-1 text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-40"
              >
                {loadingPeers ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-card-hover/20">
                  {["Company", "Mkt Cap", "Trailing P/E", "Fwd P/E", "P/B", "EV/EBITDA", "Rev Growth", "Gross Mgn", "Op Mgn", "ROE"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-muted font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peers.map((p, i) => {
                  const isSubject = p.symbol === symbol;
                  return (
                    <tr key={p.symbol} className={`border-b border-border/30 last:border-0 ${isSubject ? "bg-accent/5 font-semibold" : i % 2 === 0 ? "" : "bg-card-hover/10"}`}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={isSubject ? "text-accent" : "text-foreground"}>{p.symbol}</span>
                        <span className="text-muted ml-1.5 font-normal">{p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name}</span>
                      </td>
                      <td className="px-3 py-2 font-mono">{p.marketCap != null ? `$${(p.marketCap / 1e9).toFixed(1)}B` : "—"}</td>
                      <td className="px-3 py-2 font-mono">{p.trailingPE != null ? p.trailingPE.toFixed(1) + "x" : "—"}</td>
                      <td className="px-3 py-2 font-mono">{p.forwardPE != null ? p.forwardPE.toFixed(1) + "x" : "—"}</td>
                      <td className="px-3 py-2 font-mono">{p.priceToBook != null ? p.priceToBook.toFixed(2) + "x" : "—"}</td>
                      <td className="px-3 py-2 font-mono">{p.evToEbitda != null ? p.evToEbitda.toFixed(1) + "x" : "—"}</td>
                      <td className={`px-3 py-2 font-mono ${p.revenueGrowth != null && p.revenueGrowth > 0 ? "text-green" : p.revenueGrowth != null ? "text-red" : ""}`}>{p.revenueGrowth != null ? `${(p.revenueGrowth * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-2 font-mono">{p.grossMargins != null ? `${(p.grossMargins * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-2 font-mono">{p.operatingMargins != null ? `${(p.operatingMargins * 100).toFixed(1)}%` : "—"}</td>
                      <td className={`px-3 py-2 font-mono ${p.returnOnEquity != null && p.returnOnEquity > 0 ? "text-green" : p.returnOnEquity != null ? "text-red" : ""}`}>{p.returnOnEquity != null ? `${(p.returnOnEquity * 100).toFixed(1)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pitch Score Panel */}
      {showScore && score && (
        <div className="mb-6 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card-hover/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-accent" />
              AI Pitch Score
            </h3>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold font-mono ${score.overall >= 75 ? "text-green" : score.overall >= 55 ? "text-accent" : "text-red"}`}>
                {score.overall}<span className="text-sm text-muted font-normal">/100</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-muted mb-5 italic">{score.summary}</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
              {([
                { key: "thesis", label: "Thesis" },
                { key: "valuation", label: "Valuation" },
                { key: "financials", label: "Financials" },
                { key: "catalysts", label: "Catalysts" },
                { key: "risks", label: "Risks" },
                { key: "recommendation", label: "Rec." },
              ] as { key: keyof PitchScore; label: string }[]).map(({ key, label }) => {
                const val = score[key] as number;
                return (
                  <div key={key} className="text-center">
                    <div className={`text-lg font-bold font-mono ${val >= 75 ? "text-green" : val >= 55 ? "text-accent" : "text-red"}`}>{val}</div>
                    <div className="text-xs text-muted mt-0.5">{label}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full ${val >= 75 ? "bg-green" : val >= 55 ? "bg-accent" : "bg-red"}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-green mb-2">Strengths</div>
                <ul className="space-y-1">
                  {score.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-muted flex items-start gap-1.5">
                      <Check className="h-3 w-3 text-green mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-red mb-2">Areas to Improve</div>
                <ul className="space-y-1">
                  {score.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-muted flex items-start gap-1.5">
                      <ChevronDown className="h-3 w-3 text-red mt-0.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pitch Sections */}
      {symbol ? (
        <div className="space-y-4">
          {PITCH_SECTION_META.map(({ key, label, description }) => (
            <PitchSectionEditor
              key={key}
              sectionKey={key}
              label={label}
              description={description}
              content={sections[key]}
              onChange={(val) => updateSection(key, val)}
              onGenerate={() => generateSection(key)}
              isGenerating={generatingSection === key}
              canGenerate={!!stockData && !generatingSection}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-1">Select a stock to get started</p>
          <p className="text-sm">
            Search for a company above, then use AI to generate each section of
            your pitch or write them manually.
          </p>
        </div>
      )}
    </div>
  );
}

function PitchSectionEditor({
  sectionKey,
  label,
  description,
  content,
  onChange,
  onGenerate,
  isGenerating,
  canGenerate,
}: {
  sectionKey: string;
  label: string;
  description: string;
  content: string;
  onChange: (val: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(
        120,
        textareaRef.current.scrollHeight
      )}px`;
    }
  }, [content]);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card-hover/30">
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="flex items-center gap-1.5 rounded-lg bg-accent/10 text-accent px-3 py-1.5 text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              {content ? "Regenerate" : "Generate"}
            </>
          )}
        </button>
      </div>
      <div className="p-4">
        <textarea
          ref={textareaRef}
          id={`section-${sectionKey}`}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Write or generate ${label.toLowerCase()}...`}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/50 resize-none focus:outline-none min-h-[120px] leading-relaxed"
          readOnly={isGenerating}
        />
      </div>
    </div>
  );
}

export default function PitchPage() {
  return (
    <Suspense fallback={<div className="min-w-0 animate-pulse h-64 rounded-xl bg-card border border-border" />}>
      <PitchPageContent />
    </Suspense>
  );
}

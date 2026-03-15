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
  const [showPitchList, setShowPitchList] = useState(false);
  const [loadingPitches, setLoadingPitches] = useState(false);
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

  useEffect(() => {
    fetchSavedPitches();
  }, [fetchSavedPitches]);

  useEffect(() => {
    const urlSymbol = searchParams.get("symbol")?.trim().toUpperCase();
    if (urlSymbol) {
      setSymbol(urlSymbol);
      fetchStockData(urlSymbol);
    }
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPitchList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchStockData(sym: string) {
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
  }

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
        body: JSON.stringify({ section: "full", stockData }),
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
  }

  function copyToClipboard() {
    const markdown = buildMarkdown();
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* Generate Full Pitch Button */}
      {stockData && (
        <div className="mb-6">
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
              </>
            )}
          </button>
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

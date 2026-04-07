"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Layers, Network, Loader2 } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import type {
  SupplyChainCompany,
  SupplyChainLayer,
  SupplyChainLayersFile,
} from "@/types/supplyChain";
import CompanyDetailPanel from "@/components/supply-chain/CompanyDetailPanel";

const EcosystemMap = dynamic(
  () => import("@/components/supply-chain/EcosystemMap"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20 gap-2 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading ecosystem…</span>
      </div>
    ),
    ssr: false,
  }
);

/** Left border accent: L1 most foundational (darkest) → L6 lightest, keyed by layer id. */
const LAYER_LEFT_BORDER: Record<string, string> = {
  L1: "#4c1d95",
  L2: "#1e3a8a",
  L3: "#134e4a",
  L4: "#92400e",
  L5: "#9a3412",
  L6: "#fbcfe8",
};

const MOAT_BADGE: Record<string, { className: string }> = {
  monopoly: { className: "bg-red/15 text-red border border-red/35" },
  duopoly: { className: "bg-orange-500/15 text-orange-400 border border-orange-500/35" },
  oligopoly: { className: "bg-amber-500/15 text-amber-400 border border-amber-500/35" },
  lord: { className: "bg-blue-500/15 text-blue-400 border border-blue-500/35" },
  vassal: { className: "bg-purple-500/15 text-purple-400 border border-purple-500/35" },
  toll: { className: "bg-teal-500/15 text-teal-400 border border-teal-500/35" },
  utility: { className: "bg-green/15 text-green border border-green/35" },
  leader: { className: "bg-sky-500/15 text-sky-400 border border-sky-500/35" },
  "partial-lord": { className: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/35" },
};

const RISK_BADGE: Record<string, string> = {
  critical: "bg-red/15 text-red border border-red/30",
  high: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  low: "bg-green/15 text-green border border-green/30",
};

function MoatBadge({ moatType }: { moatType: string }) {
  const meta = MOAT_BADGE[moatType] ?? {
    className: "bg-card-hover text-muted border border-border",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {moatType}
    </span>
  );
}

function BottleneckBadge({ risk }: { risk: string }) {
  const cls = RISK_BADGE[risk] ?? "bg-card-hover text-muted border border-border";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${cls}`}
    >
      {risk}
    </span>
  );
}

function useQuoteMap() {
  const [quotesBySymbol, setQuotesBySymbol] = useState<Record<string, StockQuote>>({});

  const load = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    const symbols = [...new Set(tickers)].join(",");
    try {
      const res = await fetch(
        `/api/stocks?action=quotes&symbols=${encodeURIComponent(symbols)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as StockQuote[];
      const next: Record<string, StockQuote> = {};
      for (const q of data) {
        if (q?.symbol) next[q.symbol.toUpperCase()] = q;
      }
      setQuotesBySymbol(next);
    } catch {
      /* keep prior */
    }
  }, []);

  return { quotesBySymbol, load };
}

function isHighlightMatch(company: SupplyChainCompany, raw: string | null): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (company.ticker) {
    if (company.ticker.toUpperCase() === trimmed.toUpperCase()) return true;
  }
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    /* use trimmed */
  }
  if (company.name === decoded || company.name === trimmed) return true;
  return company.name.toLowerCase() === trimmed.toLowerCase();
}

function CompanyCard({
  company,
  quote,
  highlighted,
  selected,
  onClick,
}: {
  company: SupplyChainCompany;
  quote: StockQuote | undefined;
  highlighted?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  const sym = company.ticker?.toUpperCase();
  const positive = (quote?.regularMarketChange ?? 0) >= 0;

  return (
    <div
      role="button"
      tabIndex={0}
      data-supply-chain-card={sym ?? company.name.replace(/\s+/g, "-").slice(0, 32)}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={`group relative flex flex-col gap-2 rounded-xl border bg-card p-3 min-w-[220px] max-w-[260px] shrink-0 transition-all cursor-pointer hover:bg-card-hover hover:shadow-md ${
        selected
          ? "border-accent border-2 ring-2 ring-accent/40 shadow-lg bg-card-hover"
          : highlighted
          ? "border-accent/60 border-2 ring-1 ring-accent/25"
          : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {sym ? (
            <span className="font-mono text-base font-semibold text-accent">
              {sym}
            </span>
          ) : (
            <span className="font-mono text-base font-semibold text-muted">Private</span>
          )}
          {quote && (
            <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-sm text-foreground">
                $
                {quote.regularMarketPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className={`font-mono text-xs ${positive ? "text-green" : "text-red"}`}>
                {positive ? "+" : ""}
                {quote.regularMarketChange.toFixed(2)} ({positive ? "+" : ""}
                {quote.regularMarketChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
          {!quote && sym && (
            <p className="text-[11px] text-muted mt-0.5">Price unavailable</p>
          )}
        </div>
        {/* Expand hint */}
        <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          Details →
        </span>
      </div>

      <p className="text-xs font-medium text-foreground leading-snug">{company.role}</p>
      <MoatBadge moatType={company.moatType} />
      <p className="text-[11px] text-muted leading-snug">{company.concentrationNote}</p>
    </div>
  );
}

function LayerBand({
  layer,
  quotesBySymbol,
  highlightParam,
  selectedKey,
  onSelectCompany,
}: {
  layer: SupplyChainLayer;
  quotesBySymbol: Record<string, StockQuote>;
  highlightParam: string | null;
  selectedKey: string | null;
  onSelectCompany: (company: SupplyChainCompany, layer: SupplyChainLayer) => void;
}) {
  const borderColor = LAYER_LEFT_BORDER[layer.id] ?? "#6b7280";

  return (
    <section
      id={`supply-chain-layer-${layer.id}`}
      className="w-full rounded-xl border border-border bg-card overflow-hidden flex flex-col md:flex-row md:items-stretch scroll-mt-4"
      style={{ borderLeftWidth: 2, borderLeftColor: borderColor }}
    >
      <div className="md:w-[30%] shrink-0 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-border bg-background/40">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center rounded-full border border-border bg-card-hover px-2.5 py-0.5 text-xs font-mono font-semibold text-foreground">
            {layer.id}
          </span>
          <BottleneckBadge risk={layer.bottleneckRisk} />
        </div>
        <h2 className="text-[20px] font-semibold font-serif text-foreground leading-tight">
          {layer.name}
        </h2>
        <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{layer.nickname}</p>
      </div>

      <div className="md:w-[70%] min-w-0 flex-1 p-3 sm:p-4">
        <div className="flex gap-3 overflow-x-auto pb-1 ticker-scrollbar-hide">
          {layer.companies.map((c) => {
            const t = c.ticker?.toUpperCase();
            const cardKey = `${layer.id}-${c.name}`;
            return (
              <CompanyCard
                key={`${layer.id}-${c.name}-${t ?? "private"}`}
                company={c}
                quote={t ? quotesBySymbol[t] : undefined}
                highlighted={isHighlightMatch(c, highlightParam)}
                selected={selectedKey === cardKey}
                onClick={() => onSelectCompany(c, layer)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface SelectedEntry {
  company: SupplyChainCompany;
  layer: SupplyChainLayer;
  key: string;
}

function LayersView({
  layerScroll,
  highlightParam,
}: {
  layerScroll: string | null;
  highlightParam: string | null;
}) {
  const [data, setData] = useState<SupplyChainLayersFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedEntry | null>(null);
  const { quotesBySymbol, load } = useQuoteMap();

  function handleSelect(company: SupplyChainCompany, layer: SupplyChainLayer) {
    const key = `${layer.id}-${company.name}`;
    setSelected((prev) => (prev?.key === key ? null : { company, layer, key }));
  }

  const allTickers = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    for (const L of data.layers) {
      for (const c of L.companies) {
        if (c.ticker) s.add(c.ticker.toUpperCase());
      }
    }
    return [...s];
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/supply-chain-layers.json");
        if (!res.ok) throw new Error("Failed to load supply chain data");
        const json = (await res.json()) as SupplyChainLayersFile;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setLoadError("Could not load supply chain layers.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (allTickers.length === 0) return;
    load(allTickers);
    const id = window.setInterval(() => load(allTickers), 60_000);
    return () => window.clearInterval(id);
  }, [allTickers, load]);

  useEffect(() => {
    if (!layerScroll || !data) return;
    const el = document.getElementById(`supply-chain-layer-${layerScroll}`);
    if (el) {
      const t = window.setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => window.clearTimeout(t);
    }
  }, [layerScroll, data]);

  if (loadError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted">
        {loadError}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted">
        Loading supply chain…
      </div>
    );
  }

  const selectedQuote =
    selected?.company.ticker
      ? quotesBySymbol[selected.company.ticker.toUpperCase()]
      : undefined;

  return (
    <>
      <div className="flex flex-col gap-4">
        {data.layers.map((layer) => (
          <LayerBand
            key={layer.id}
            layer={layer}
            quotesBySymbol={quotesBySymbol}
            highlightParam={highlightParam}
            selectedKey={selected?.key ?? null}
            onSelectCompany={handleSelect}
          />
        ))}
      </div>

      {selected && (
        <CompanyDetailPanel
          company={selected.company}
          layer={selected.layer}
          quote={selectedQuote}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

type SemiconductorSubView = "layers" | "ecosystem";

function parseSubView(raw: string | null): SemiconductorSubView {
  if (raw === "ecosystem") return "ecosystem";
  return "layers";
}

export default function SemiconductorView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const subView = parseSubView(searchParams.get("view"));
  const layerScroll = searchParams.get("layer");
  const highlightParam = searchParams.get("highlight");

  function setSubView(v: SemiconductorSubView) {
    const params = new URLSearchParams();
    params.set("industry", "semiconductors");
    if (v !== "layers") params.set("view", v);
    router.replace(`/supply-chain?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setSubView("layers")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            subView === "layers"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Supply Chain Layers
        </button>
        <button
          type="button"
          onClick={() => setSubView("ecosystem")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            subView === "ecosystem"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Network className="h-4 w-4" />
          AI Ecosystem
        </button>
      </div>

      {subView === "layers" && (
        <LayersView layerScroll={layerScroll} highlightParam={highlightParam} />
      )}
      {subView === "ecosystem" && <EcosystemMap />}
    </div>
  );
}

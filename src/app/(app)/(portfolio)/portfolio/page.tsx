"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  FolderPlus,
  Trash2,
  X,
  Download,
} from "lucide-react";
import PortfolioTable from "@/components/PortfolioTable";
import PortfolioEarningsUpcoming from "@/components/PortfolioEarningsUpcoming";
import PortfolioStats from "@/components/portfolio/PortfolioStats";
import AddPositionModal from "@/components/AddPositionModal";
import EditPositionModal from "@/components/EditPositionModal";
import WatchlistTable from "@/components/WatchlistTable";
import AddToWatchlistModal from "@/components/AddToWatchlistModal";
import type { EnrichedPosition, UserPortfolio } from "@/lib/types";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import {
  AVAILABLE_METRICS,
  FIXED_PORTFOLIO_TABLE_METRIC_KEYS,
  FIXED_PORTFOLIO_TABLE_METRIC_KEY_SET,
  tableMetricLabel,
} from "@/lib/metrics";
import type { NumberScale } from "@/components/PortfolioWatchlistMetricCells";

type PortfolioSubTab = "holdings" | "watchlist";

const ACTIVE_PORTFOLIO_KEY = "active-portfolio-id";
const NUMBER_SCALE_KEY = "gcm-number-scale";

/** Ensures session cookies are sent for API routes (same as other app pages). */
const apiFetch = (input: string, init?: RequestInit) =>
  fetch(input, { ...init, credentials: "include" });

const ghostBtn =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-card hover:text-foreground";

function PortfolioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab: PortfolioSubTab =
    searchParams.get("tab") === "watchlist" ? "watchlist" : "holdings";

  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [portfoliosError, setPortfoliosError] = useState<string | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);

  const wlGroupRef = useRef<string | null>(null);
  const [watchlistRefreshNonce, setWatchlistRefreshNonce] = useState(0);

  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showNewPortfolioModal, setShowNewPortfolioModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [valuesVisible, setValuesVisible] = useState(true);
  const [editingPosition, setEditingPosition] = useState<EnrichedPosition | null>(null);

  const [visibleKeys, toggleKey] = useColumnPreferences();
  const [metricQuery, setMetricQuery] = useState("");
  const [numberScale, setNumberScale] = useState<NumberScale>("B");

  const activePortfolioIdRef = useRef<string | null>(null);
  useEffect(() => {
    activePortfolioIdRef.current = activePortfolioId;
  }, [activePortfolioId]);

  /** First successful load per portfolio id uses `cache: 'no-store'`; manual refresh does not. */
  const holdingsNoStoreDoneForIdRef = useRef<string | null>(null);
  const positionsBackoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (positionsBackoffTimerRef.current) {
        clearTimeout(positionsBackoffTimerRef.current);
        positionsBackoffTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("portfolio-values-visible");
    if (stored !== null) setValuesVisible(stored === "true");
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(NUMBER_SCALE_KEY);
      if (v === "K" || v === "M" || v === "B") setNumberScale(v);
    } catch {
      /* ignore */
    }
  }, []);

  function persistNumberScale(next: NumberScale) {
    setNumberScale(next);
    try {
      localStorage.setItem(NUMBER_SCALE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const filteredMetrics = useMemo(() => {
    const q = metricQuery.trim().toLowerCase();
    if (!q) return AVAILABLE_METRICS;
    return AVAILABLE_METRICS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q)
    );
  }, [metricQuery]);

  const portfolioVisibleKeys = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const key of FIXED_PORTFOLIO_TABLE_METRIC_KEYS) {
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
    for (const key of visibleKeys) {
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
    return out;
  }, [visibleKeys]);

  const fetchPortfolios = useCallback(async () => {
    setPortfoliosLoading(true);
    setPortfoliosError(null);
    try {
      const res = await apiFetch("/api/portfolios");
      if (!res.ok) {
        let msg = "Could not load portfolios.";
        try {
          const body = await res.json();
          if (typeof body?.error === "string") msg = body.error;
        } catch {
          /* ignore */
        }
        setPortfoliosError(msg);
        setPortfolios([]);
        return;
      }
      const data: UserPortfolio[] = await res.json();
      setPortfolios(data);

      setActivePortfolioId((prev) => {
        if (typeof window === "undefined") return data[0]?.id ?? null;
        const saved = localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
        const match = saved ? data.find((p) => p.id === saved) : null;
        if (match) return match.id;
        if (prev && data.some((p) => p.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch {
      setPortfoliosError("Network error loading portfolios.");
      setPortfolios([]);
    } finally {
      setPortfoliosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  useEffect(() => {
    if (!activePortfolioId) return;
    localStorage.setItem(ACTIVE_PORTFOLIO_KEY, activePortfolioId);
  }, [activePortfolioId]);

  const fetchPositions = useCallback(
    async (showLoader = true, attempt = 0, manualRefresh = false) => {
      if (!activePortfolioId) {
        setPositions([]);
        setPositionsError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const pid = activePortfolioId;
      if (attempt === 0) {
        setPositionsError(null);
        if (showLoader) setLoading(true);
        else setRefreshing(true);
      }

      const useNoStore =
        attempt === 0 &&
        !manualRefresh &&
        holdingsNoStoreDoneForIdRef.current !== pid;

      const finishLoading = () => {
        setLoading(false);
        setRefreshing(false);
      };

      let scheduleRetry = false;

      try {
        const res = await apiFetch(
          `/api/portfolio?portfolioId=${encodeURIComponent(pid)}`,
          useNoStore ? { cache: "no-store" } : undefined
        );

        if (res.status === 429) {
          if (attempt >= 3) {
            setPositionsError("Too many requests");
            setPositions([]);
            finishLoading();
            return;
          }
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          positionsBackoffTimerRef.current = setTimeout(() => {
            positionsBackoffTimerRef.current = null;
            if (activePortfolioIdRef.current !== pid) return;
            void fetchPositions(showLoader, attempt + 1, manualRefresh);
          }, delay);
          scheduleRetry = true;
          return;
        }

        if (res.ok) {
          holdingsNoStoreDoneForIdRef.current = pid;
          const data = await res.json();
          setPositions(Array.isArray(data) ? data : []);
        } else {
          let msg = "Could not load holdings.";
          try {
            const body = await res.json();
            if (typeof body?.error === "string") msg = body.error;
          } catch {
            /* ignore */
          }
          setPositionsError(msg);
          setPositions([]);
        }
      } catch {
        setPositionsError("Portfolio data unavailable");
        setPositions([]);
      } finally {
        if (!scheduleRetry) finishLoading();
      }
    },
    [activePortfolioId]
  );

  useEffect(() => {
    if (!activePortfolioId) {
      setPositions([]);
      setPositionsError(null);
      setLoading(false);
      return;
    }
    void fetchPositions(true, 0, false);
  }, [activePortfolioId, fetchPositions]);

  async function handleAddPosition(position: {
    symbol: string;
    name: string;
    shares: number;
    avgCost: number;
    purchaseDate?: string;
  }) {
    if (!activePortfolioId) return;
    const res = await apiFetch(
      `/api/portfolio?portfolioId=${encodeURIComponent(activePortfolioId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(position),
      }
    );
    if (res.ok) {
      fetchPositions(false, 0, true);
      fetchPortfolios();
    }
  }

  async function handleDeletePosition(id: string) {
    if (!activePortfolioId) return;
    const res = await apiFetch(
      `/api/portfolio?id=${encodeURIComponent(id)}&portfolioId=${encodeURIComponent(activePortfolioId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      fetchPositions(false, 0, true);
      fetchPortfolios();
    }
  }

  async function handleAddWatchlist(item: { symbol: string; name: string }) {
    const groupId = wlGroupRef.current;
    const res = await apiFetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...item,
        ...(groupId ? { groupId } : {}),
      }),
    });
    if (res.ok) {
      setWatchlistRefreshNonce((n) => n + 1);
    }
  }

  async function handleReorderPositions(reordered: EnrichedPosition[]) {
    if (!activePortfolioId) return;
    setPositions(reordered);
    await apiFetch(
      `/api/portfolio?portfolioId=${encodeURIComponent(activePortfolioId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
      }
    );
  }

  async function handleCreatePortfolio(e: React.FormEvent) {
    e.preventDefault();
    const name = newPortfolioName.trim();
    if (!name) return;
    setCreatingPortfolio(true);
    setPortfoliosError(null);
    try {
      const res = await apiFetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const created: UserPortfolio = await res.json();
        setPortfolios((prev) =>
          [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
        );
        setActivePortfolioId(created.id);
        setShowNewPortfolioModal(false);
        setNewPortfolioName("");
      } else {
        let msg = "Could not create portfolio.";
        try {
          const body = await res.json();
          if (typeof body?.error === "string") msg = body.error;
        } catch {
          /* ignore */
        }
        setPortfoliosError(msg);
      }
    } catch {
      setPortfoliosError("Network error creating portfolio.");
    } finally {
      setCreatingPortfolio(false);
    }
  }

  async function handleDeleteActivePortfolio() {
    if (!activePortfolioId || portfolios.length <= 1) return;
    if (
      !window.confirm(
        "Delete this portfolio and all its positions? This cannot be undone."
      )
    ) {
      return;
    }
    const res = await apiFetch(
      `/api/portfolios?id=${encodeURIComponent(activePortfolioId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const next = portfolios.filter((p) => p.id !== activePortfolioId);
      setPortfolios(next);
      const fallback = next[0]?.id ?? null;
      setActivePortfolioId(fallback);
      if (fallback) localStorage.setItem(ACTIVE_PORTFOLIO_KEY, fallback);
      else localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
      fetchPortfolios();
    }
  }

  function handleRefresh() {
    if (activeTab === "watchlist") {
      setWatchlistRefreshNonce((n) => n + 1);
      return;
    }
    fetchPositions(false, 0, true);
    fetchPortfolios();
  }

  function toggleValuesVisible() {
    setValuesVisible((v) => {
      const next = !v;
      localStorage.setItem("portfolio-values-visible", String(next));
      return next;
    });
  }

  function handleEditPositionRequest(position: EnrichedPosition) {
    setEditingPosition(position);
  }

  async function handleInlinePositionUpdate(
    position: EnrichedPosition,
    updates: Partial<Pick<EnrichedPosition, "shares" | "avgCost">>
  ) {
    if (!activePortfolioId) return;

    const nextShares = updates.shares ?? position.shares;
    const nextAvgCost = updates.avgCost ?? position.avgCost;
    if (
      !Number.isFinite(nextShares) ||
      nextShares <= 0 ||
      !Number.isFinite(nextAvgCost) ||
      nextAvgCost <= 0
    ) {
      return;
    }

    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== position.id) return p;
        const marketValue = p.currentPrice * nextShares;
        const costBasis = nextAvgCost * nextShares;
        const totalPL = marketValue - costBasis;
        return {
          ...p,
          shares: nextShares,
          avgCost: nextAvgCost,
          marketValue,
          totalPL,
          totalPLPercent: costBasis > 0 ? (totalPL / costBasis) * 100 : 0,
        };
      })
    );

    const res = await apiFetch(
      `/api/portfolio?portfolioId=${encodeURIComponent(activePortfolioId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: position.id, ...updates }),
      }
    );

    if (!res.ok) {
      await fetchPositions(false, 0, true);
      throw new Error("Failed to update position");
    }

    fetchPositions(false, 0, true);
    fetchPortfolios();
  }

  function addMetricColumn(key: string) {
    if (
      !visibleKeys.includes(key) &&
      !FIXED_PORTFOLIO_TABLE_METRIC_KEY_SET.has(key)
    ) {
      toggleKey(key);
    }
    setMetricQuery("");
  }

  const tabPill = (id: PortfolioSubTab, label: string) => {
    const active = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => {
          if (id === "holdings") router.replace("/portfolio", { scroll: false });
          else router.replace("/portfolio?tab=watchlist", { scroll: false });
        }}
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          active
            ? "border border-accent/20 bg-accent/10 text-accent"
            : "border border-transparent text-muted hover:text-foreground"
        }`}
      >
        {label}
      </button>
    );
  };

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {tabPill("holdings", "Holdings")}
        {tabPill("watchlist", "Watchlist")}
      </div>

      {portfoliosError && (
        <div className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red-200">
          <p className="font-medium">Portfolio data</p>
          <p className="mt-1 text-red-200/90">{portfoliosError}</p>
          <button
            type="button"
            onClick={() => fetchPortfolios()}
            className="mt-2 text-sm underline hover:text-foreground"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="max-w-2xl text-xs text-muted">
          {activePortfolio ? (
            <span className="text-foreground/90">{activePortfolio.name}</span>
          ) : (
            "Portfolio"
          )}
          {" · "}
          Use <span className="text-foreground/90">New portfolio</span> for separate holdings lists.
          Switch <span className="text-foreground/90">Holdings</span> and{" "}
          <span className="text-foreground/90">Watchlist</span> above; open{" "}
          <span className="text-foreground/90">Performance</span> from the sidebar for history and
          benchmark charts.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {portfoliosLoading ? (
            <div className="h-10 w-48 animate-pulse rounded-lg border border-border bg-card" />
          ) : portfolios.length <= 4 ? (
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/50 p-1">
              {portfolios.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePortfolioId(p.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    p.id === activePortfolioId
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-card-hover hover:text-foreground"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={activePortfolioId ?? ""}
              onChange={(e) => setActivePortfolioId(e.target.value || null)}
              className="min-w-[12rem] rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setShowNewPortfolioModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-hover hover:text-foreground"
          >
            <FolderPlus className="h-4 w-4" />
            New portfolio
          </button>
          {activeTab === "holdings" &&
            portfolios.length > 1 &&
            activePortfolioId && (
              <button
                type="button"
                onClick={handleDeleteActivePortfolio}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-red transition-colors hover:bg-red/10"
                title="Delete current portfolio"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete portfolio</span>
              </button>
            )}
        </div>
      </div>

      {activeTab === "holdings" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="relative min-w-[12rem] max-w-md flex-1">
              <input
                type="search"
                value={metricQuery}
                onChange={(e) => setMetricQuery(e.target.value)}
                placeholder="Search columns: revenue, margins, balance sheet, P/E…"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                aria-label="Search columns to add (price, fundamentals, ratios)"
              />
              {metricQuery.trim() && filteredMetrics.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg">
                  {filteredMetrics.map((m) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-card-hover"
                        onClick={() => addMetricColumn(m.key)}
                      >
                        {m.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {portfolioVisibleKeys.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {tableMetricLabel(key)}
                  {!FIXED_PORTFOLIO_TABLE_METRIC_KEY_SET.has(key) && (
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-muted hover:text-foreground"
                      aria-label={`Remove ${tableMetricLabel(key)}`}
                      onClick={() => toggleKey(key)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleValuesVisible}
                className={ghostBtn}
                title={valuesVisible ? "Hide market values" : "Show market values"}
              >
                {valuesVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPositionModal(true)}
                disabled={!activePortfolioId}
                className={`${ghostBtn} disabled:opacity-40`}
              >
                <Plus className="h-4 w-4" />
                Add Position
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className={`${ghostBtn} disabled:opacity-40`}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-border">
                {(["K", "M", "B"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => persistNumberScale(s)}
                    className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      numberScale === s
                        ? "bg-accent/10 text-accent"
                        : "text-muted hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* TODO: export holdings table */}
              <button
                type="button"
                className={ghostBtn}
                title="Export coming soon"
                onClick={() => {
                  /* TODO: holdings export */
                }}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {positionsError && !loading && (
            <div className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red-200">
              {positionsError}
              <button
                type="button"
                onClick={() => fetchPositions(false, 0, true)}
                className="ml-3 underline hover:text-foreground"
              >
                Retry
              </button>
            </div>
          )}

          <PortfolioEarningsUpcoming />

          <PortfolioTable
            positions={positions}
            visibleKeys={portfolioVisibleKeys}
            numberScale={numberScale}
            onDelete={handleDeletePosition}
            onReorder={handleReorderPositions}
            onUpdatePosition={handleInlinePositionUpdate}
            valuesVisible={valuesVisible}
            onEdit={handleEditPositionRequest}
            loading={loading}
          />

          <PortfolioStats positions={positions} />
        </>
      )}

      <div
        className={
          activeTab === "watchlist" ? "flex flex-col gap-4" : "hidden"
        }
        aria-hidden={activeTab !== "watchlist"}
      >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleValuesVisible}
                className={ghostBtn}
                title={valuesVisible ? "Hide market values" : "Show market values"}
              >
                {valuesVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button type="button" onClick={() => setShowWatchlistModal(true)} className={ghostBtn}>
                <Plus className="h-4 w-4" />
                Add to Watchlist
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className={`${ghostBtn} disabled:opacity-40`}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
          <WatchlistTable
            valuesVisible={valuesVisible}
            refreshNonce={watchlistRefreshNonce}
            activeGroupIdRef={wlGroupRef}
          />
      </div>

      {showPositionModal && (
        <AddPositionModal
          onClose={() => setShowPositionModal(false)}
          onAdd={handleAddPosition}
        />
      )}

      {editingPosition && activePortfolioId && (
        <EditPositionModal
          position={editingPosition}
          portfolioId={activePortfolioId}
          onClose={() => setEditingPosition(null)}
          onSaved={() => {
            setEditingPosition(null);
            fetchPositions(false, 0, true);
            fetchPortfolios();
          }}
        />
      )}

      {showWatchlistModal && (
        <AddToWatchlistModal
          onClose={() => setShowWatchlistModal(false)}
          onAdd={handleAddWatchlist}
        />
      )}

      {showNewPortfolioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">New portfolio</h2>
              <button
                type="button"
                onClick={() => {
                  setShowNewPortfolioModal(false);
                  setNewPortfolioName("");
                }}
                className="rounded-lg p-1 hover:bg-card-hover"
              >
                <X className="h-5 w-5 text-muted" />
              </button>
            </div>
            <form onSubmit={handleCreatePortfolio} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted">Name</label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="e.g. Retirement, Growth"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPortfolioModal(false);
                    setNewPortfolioName("");
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPortfolio || !newPortfolioName.trim()}
                  className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-40"
                >
                  {creatingPortfolio ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense
      fallback={
        <div
          className="h-40 animate-pulse rounded-xl border border-border bg-card"
          aria-hidden
        />
      }
    >
      <PortfolioPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Briefcase, Eye, EyeOff, FolderPlus, Trash2, X } from "lucide-react";
import PortfolioTable from "@/components/PortfolioTable";
import PortfolioPerformanceChart from "@/components/PortfolioPerformanceChart";
import AddPositionModal from "@/components/AddPositionModal";
import EditPositionModal from "@/components/EditPositionModal";
import WatchlistTable from "@/components/WatchlistTable";
import AddToWatchlistModal from "@/components/AddToWatchlistModal";
import type { EnrichedPosition, EnrichedWatchlistItem, UserPortfolio } from "@/lib/types";

type PortfolioTab = "holdings" | "watchlist";

const ACTIVE_PORTFOLIO_KEY = "active-portfolio-id";

/** Ensures session cookies are sent for API routes (same as other app pages). */
const apiFetch = (input: string, init?: RequestInit) =>
  fetch(input, { ...init, credentials: "include" });

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("holdings");
  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [portfoliosError, setPortfoliosError] = useState<string | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);

  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [watchlist, setWatchlist] = useState<EnrichedWatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showNewPortfolioModal, setShowNewPortfolioModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [valuesVisible, setValuesVisible] = useState(true);
  const [editingPosition, setEditingPosition] = useState<EnrichedPosition | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("portfolio-values-visible");
    if (stored !== null) setValuesVisible(stored === "true");
  }, []);

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
        if (res.status === 500) {
          msg +=
            " The database may need migrations (e.g. run `npx prisma migrate deploy` on the server).";
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

  const fetchPositions = useCallback(async (showLoader = true) => {
    if (!activePortfolioId) {
      setPositions([]);
      setPositionsError(null);
      setLoading(false);
      return;
    }
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setPositionsError(null);
    try {
      const res = await apiFetch(
        `/api/portfolio?portfolioId=${encodeURIComponent(activePortfolioId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
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
      setPositionsError("Network error loading holdings.");
      setPositions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePortfolioId]);

  const fetchWatchlist = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiFetch("/api/watchlist");
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

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
      fetchPositions(false);
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
      fetchPositions(false);
      fetchPortfolios();
    }
  }

  async function handleAddWatchlist(item: { symbol: string; name: string }) {
    const res = await apiFetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      fetchWatchlist(false);
    }
  }

  async function handleRemoveWatchlist(id: string) {
    const res = await apiFetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchWatchlist(false);
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

  async function handleReorderWatchlist(reordered: EnrichedWatchlistItem[]) {
    setWatchlist(reordered);
    await apiFetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((w) => w.id) }),
    });
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
    if (activeTab === "holdings") {
      fetchPositions(false);
      fetchPortfolios();
    } else {
      fetchWatchlist(false);
    }
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

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Portfolio</h1>
          <p className="text-sm text-muted">
            {activePortfolio
              ? `${activePortfolio.name} — track your holdings and watchlist`
              : "Track your holdings and watchlist"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={toggleValuesVisible}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
            title={valuesVisible ? "Hide market values" : "Show market values"}
          >
            {valuesVisible ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span className="hidden sm:inline">Hide Mkt Value</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Show Mkt Value</span>
              </>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors disabled:opacity-40"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          {activeTab === "holdings" ? (
            <button
              onClick={() => setShowPositionModal(true)}
              disabled={!activePortfolioId}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add Position
            </button>
          ) : (
            <button
              onClick={() => setShowWatchlistModal(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add to Watchlist
            </button>
          )}
        </div>
      </div>

      {portfoliosError && (
        <div className="mb-4 rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red-200">
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

      {/* Portfolio switcher — separate lists per portfolio (same idea as Yahoo portfolios) */}
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs text-muted max-w-2xl">
          Use <span className="text-foreground/90">New portfolio</span> to add another list of holdings.
          Each portfolio has its own positions and performance chart; switch tabs to pick which one you are editing.
        </p>
        <div className="flex flex-wrap items-center gap-2">
        {portfoliosLoading ? (
          <div className="h-10 w-48 rounded-lg bg-card border border-border animate-pulse" />
        ) : portfolios.length <= 4 ? (
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-1 bg-card/50">
            {portfolios.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePortfolioId(p.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  p.id === activePortfolioId
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
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
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground min-w-[12rem]"
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
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover transition-colors"
        >
          <FolderPlus className="h-4 w-4" />
          New portfolio
        </button>
        {activeTab === "holdings" && portfolios.length > 1 && activePortfolioId && (
          <button
            type="button"
            onClick={handleDeleteActivePortfolio}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-red hover:bg-red/10 transition-colors"
            title="Delete current portfolio"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete portfolio</span>
          </button>
        )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("holdings")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === "holdings"
              ? "text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Holdings
          {positions.length > 0 && (
            <span className="text-xs bg-accent/15 text-accent rounded-full px-1.5 py-0.5 font-mono">
              {positions.length}
            </span>
          )}
          {activeTab === "holdings" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("watchlist")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === "watchlist"
              ? "text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Eye className="h-4 w-4" />
          Watchlist
          {watchlist.length > 0 && (
            <span className="text-xs bg-accent/15 text-accent rounded-full px-1.5 py-0.5 font-mono">
              {watchlist.length}
            </span>
          )}
          {activeTab === "watchlist" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t" />
          )}
        </button>
      </div>

      {activeTab === "holdings" ? (
        <div className="space-y-4">
          {positionsError && !loading && (
            <div className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red-200">
              {positionsError}
              <button
                type="button"
                onClick={() => fetchPositions(false)}
                className="ml-3 underline hover:text-foreground"
              >
                Retry
              </button>
            </div>
          )}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-card border border-border animate-pulse"
                />
              ))}
            </div>
          )}
          {!loading && (
            <PortfolioPerformanceChart portfolioId={activePortfolioId} />
          )}
          {loading && (
            <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
          )}
          <PortfolioTable
            positions={positions}
            onDelete={handleDeletePosition}
            onReorder={handleReorderPositions}
            valuesVisible={valuesVisible}
            onEdit={handleEditPositionRequest}
            loading={loading}
          />
        </div>
      ) : (
        <WatchlistTable
          items={watchlist}
          onRemove={handleRemoveWatchlist}
          onReorder={handleReorderWatchlist}
          valuesVisible={valuesVisible}
          loading={loading}
        />
      )}

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
            fetchPositions(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
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
                <label className="block text-sm text-muted mb-1">Name</label>
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
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPortfolio || !newPortfolioName.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-40"
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

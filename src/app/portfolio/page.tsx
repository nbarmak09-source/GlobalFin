"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Briefcase, Eye, EyeOff } from "lucide-react";
import PortfolioTable from "@/components/PortfolioTable";
import PortfolioPerformanceChart from "@/components/PortfolioPerformanceChart";
import AddPositionModal from "@/components/AddPositionModal";
import EditPositionModal from "@/components/EditPositionModal";
import WatchlistTable from "@/components/WatchlistTable";
import AddToWatchlistModal from "@/components/AddToWatchlistModal";
import type { EnrichedPosition, EnrichedWatchlistItem } from "@/lib/types";

type PortfolioTab = "holdings" | "watchlist";

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("holdings");
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [watchlist, setWatchlist] = useState<EnrichedWatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [valuesVisible, setValuesVisible] = useState(true);
  const [editingPosition, setEditingPosition] = useState<EnrichedPosition | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("portfolio-values-visible");
    if (stored !== null) setValuesVisible(stored === "true");
  }, []);

  const fetchPositions = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchWatchlist = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/watchlist");
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
    fetchWatchlist();
  }, [fetchPositions, fetchWatchlist]);

  async function handleAddPosition(position: {
    symbol: string;
    name: string;
    shares: number;
    avgCost: number;
    purchaseDate?: string;
  }) {
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(position),
    });
    if (res.ok) {
      fetchPositions(false);
    }
  }

  async function handleDeletePosition(id: string) {
    const res = await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchPositions(false);
    }
  }

  async function handleAddWatchlist(item: { symbol: string; name: string }) {
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      fetchWatchlist(false);
    }
  }

  async function handleRemoveWatchlist(id: string) {
    const res = await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchWatchlist(false);
    }
  }

  async function handleReorderPositions(reordered: EnrichedPosition[]) {
    setPositions(reordered);
    await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
    });
  }

  async function handleReorderWatchlist(reordered: EnrichedWatchlistItem[]) {
    setWatchlist(reordered);
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((w) => w.id) }),
    });
  }

  function handleRefresh() {
    if (activeTab === "holdings") {
      fetchPositions(false);
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

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Portfolio</h1>
          <p className="text-sm text-muted">
            Track your holdings and watchlist
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
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

      {loading ? (
        <div className="space-y-4">
          {activeTab === "holdings" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-card border border-border animate-pulse"
                />
              ))}
            </div>
          )}
          <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
        </div>
      ) : activeTab === "holdings" ? (
        <div className="space-y-4">
          <PortfolioPerformanceChart />
          <PortfolioTable
            positions={positions}
            onDelete={handleDeletePosition}
            onReorder={handleReorderPositions}
            valuesVisible={valuesVisible}
            onEdit={handleEditPositionRequest}
          />
        </div>
      ) : (
        <WatchlistTable
          items={watchlist}
          onRemove={handleRemoveWatchlist}
          onReorder={handleReorderWatchlist}
          valuesVisible={valuesVisible}
        />
      )}

      {showPositionModal && (
        <AddPositionModal
          onClose={() => setShowPositionModal(false)}
          onAdd={handleAddPosition}
        />
      )}

      {editingPosition && (
        <EditPositionModal
          position={editingPosition}
          onClose={() => setEditingPosition(null)}
          onSaved={() => {
            setEditingPosition(null);
            fetchPositions(false);
          }}
        />
      )}

      {showWatchlistModal && (
        <AddToWatchlistModal
          onClose={() => setShowWatchlistModal(false)}
          onAdd={handleAddWatchlist}
        />
      )}
    </div>
  );
}

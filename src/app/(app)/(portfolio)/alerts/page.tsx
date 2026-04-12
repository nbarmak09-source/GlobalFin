"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
} from "lucide-react";
import SymbolSearch from "@/components/SymbolSearch";

interface AlertItem {
  id: string;
  symbol: string;
  companyName: string;
  targetPrice: number;
  direction: string;
  note: string | null;
  triggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
  currentPrice: number | null;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [selectedSymbol, setSelectedSymbol] = useState<{
    symbol: string;
    name: string;
  } | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { credentials: "include" });
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleCreate() {
    if (!selectedSymbol || !targetPrice) return;
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;

    setCreating(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol.symbol,
          companyName: selectedSymbol.name,
          targetPrice: price,
          direction,
          note: note.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setSelectedSymbol(null);
        setTargetPrice("");
        setDirection("above");
        setNote("");
        await fetchAlerts();
      }
    } catch {
      // fail silently
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/alerts?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // fail silently
    }
  }

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="space-y-8 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Price Alerts</h1>
          <p className="text-sm text-muted">
            Set target prices and track when they are hit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAlerts}
            className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent hover:bg-accent/20 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Alert
          </button>
        </div>
      </header>

      {showForm && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Create Alert</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Symbol</label>
              <SymbolSearch
                onSelect={(symbol, name) =>
                  setSelectedSymbol({ symbol, name })
                }
              />
              {selectedSymbol && (
                <p className="text-xs text-accent">
                  {selectedSymbol.symbol} — {selectedSymbol.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Target Price
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Direction
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("above")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    direction === "above"
                      ? "border-green-500 bg-green-500/10 text-green-500"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  <ArrowUpRight className="inline h-3.5 w-3.5 mr-1" />
                  Above
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("below")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    direction === "below"
                      ? "border-red-500 bg-red-500/10 text-red-500"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  <ArrowDownRight className="inline h-3.5 w-3.5 mr-1" />
                  Below
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Support level"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedSymbol || !targetPrice || creating}
            onClick={handleCreate}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Alert"}
          </button>
        </section>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-16 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Bell className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            No alerts yet. Create one to start tracking prices.
          </p>
        </div>
      ) : (
        <>
          {activeAlerts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
                Active ({activeAlerts.length})
              </h2>
              <AlertTable alerts={activeAlerts} onDelete={handleDelete} />
            </section>
          )}

          {triggeredAlerts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
                Triggered ({triggeredAlerts.length})
              </h2>
              <AlertTable alerts={triggeredAlerts} onDelete={handleDelete} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function AlertTable({
  alerts,
  onDelete,
}: {
  alerts: AlertItem[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Symbol</th>
            <th className="px-4 py-3 text-left">Direction</th>
            <th className="px-4 py-3 text-right">Target</th>
            <th className="px-4 py-3 text-right">Current</th>
            <th className="px-4 py-3 text-left">Note</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => {
            const distance =
              a.currentPrice !== null
                ? ((a.currentPrice - a.targetPrice) / a.targetPrice) * 100
                : null;

            return (
              <tr
                key={a.id}
                className={`border-b border-border last:border-0 transition-colors ${
                  a.triggered
                    ? "bg-accent/5"
                    : "hover:bg-card-hover"
                }`}
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{a.symbol}</span>
                  <span className="block text-xs text-muted truncate max-w-[140px]">
                    {a.companyName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      a.direction === "above"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {a.direction === "above" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {a.direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {fmt(a.targetPrice)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {a.currentPrice !== null ? fmt(a.currentPrice) : "—"}
                  {distance !== null && (
                    <span className="block text-xs text-muted">
                      {distance >= 0 ? "+" : ""}
                      {distance.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted text-xs max-w-[160px] truncate">
                  {a.note || "—"}
                </td>
                <td className="px-4 py-3">
                  {a.triggered ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                      <Bell className="h-3 w-3" />
                      Triggered
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Watching</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="flex items-center justify-center min-h-[44px] min-w-[44px] text-muted hover:text-red-500 transition-colors"
                    title="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

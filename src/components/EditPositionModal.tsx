"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { EnrichedPosition } from "@/lib/types";

interface EditPositionModalProps {
  position: EnrichedPosition;
  portfolioId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditPositionModal({
  position,
  portfolioId,
  onClose,
  onSaved,
}: EditPositionModalProps) {
  const [shares, setShares] = useState(String(position.shares));
  const [avgCost, setAvgCost] = useState(String(position.avgCost));
  const [purchaseDate, setPurchaseDate] = useState(
    position.purchaseDate || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shares || !avgCost) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        id: position.id,
        shares: parseFloat(shares),
        avgCost: parseFloat(avgCost),
        purchaseDate: purchaseDate || "",
      };

      const res = await fetch(
        `/api/portfolio?portfolioId=${encodeURIComponent(portfolioId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        let message = "Failed to update position";
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update position"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 mx-4 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Edit Position</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-card-hover transition-colors duration-200 cursor-pointer"
          >
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-background px-3 py-2">
          <div className="text-sm font-semibold text-accent">
            {position.symbol}
          </div>
          <div className="text-xs text-muted truncate">{position.name}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Number of Shares
            </label>
            <input
              type="number"
              step="any"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="e.g., 10"
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition-colors duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Average Cost per Share
            </label>
            <input
              type="number"
              step="any"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              placeholder="e.g., 150.00"
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition-colors duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition-colors duration-200"
            />
          </div>

          {error && (
            <p className="text-xs text-red mt-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!shares || !avgCost || submitting}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:shadow-[0_0_20px_rgba(201,162,39,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}


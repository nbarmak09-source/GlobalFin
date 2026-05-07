"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

interface BullsBearsProps {
  ticker: string;
}

interface BullsBearsData {
  bulls: string[];
  bears: string[];
}

function SkeletonColumn() {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 space-y-4">
      <div className="h-4 w-28 rounded bg-muted/20 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="space-y-2">
            <div className="h-3 w-full rounded bg-muted/20 animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-muted/20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ArgumentColumn({
  title,
  points,
  tone,
}: {
  title: string;
  points: string[];
  tone: "bull" | "bear";
}) {
  const isBull = tone === "bull";
  const Icon = isBull ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon
          aria-hidden
          className={`h-4 w-4 ${isBull ? "text-green" : "text-red"}`}
        />
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {points.map((point) => (
          <div
            key={point}
            className={`rounded-lg border-l-2 bg-card px-3 py-2 text-sm leading-relaxed text-foreground/85 ${
              isBull ? "border-green" : "border-red"
            }`}
          >
            {point}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BullsBears({ ticker }: BullsBearsProps) {
  const [data, setData] = useState<BullsBearsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) {
      setData(null);
      setLoading(false);
      setError("Ticker unavailable");
      return;
    }

    const controller = new AbortController();

    async function fetchBullsBears() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/bulls-bears", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: normalizedTicker }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load bulls and bears");
        }

        const result = (await response.json()) as BullsBearsData;
        setData(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Bulls and bears are temporarily unavailable");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchBullsBears();

    return () => controller.abort();
  }, [ticker]);

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Bulls & Bears
          </h3>
          <span className="text-xs text-accent">{ticker.toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonColumn />
          <SkeletonColumn />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Bulls & Bears
          </h3>
          <span className="text-xs text-accent">{ticker.toUpperCase()}</span>
        </div>
        <p className="text-sm text-muted">
          {error ?? "No bulls and bears available"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Bulls & Bears
        </h3>
        <span className="text-xs text-accent">{ticker.toUpperCase()}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ArgumentColumn title="Bulls Say" points={data.bulls} tone="bull" />
        <ArgumentColumn title="Bears Say" points={data.bears} tone="bear" />
      </div>
    </div>
  );
}

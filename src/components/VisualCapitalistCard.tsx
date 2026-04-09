"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, BarChart3, RefreshCw, Loader2, X } from "lucide-react";

interface VCData {
  title: string;
  link: string;
  imageUrl: string;
}

export default function VisualCapitalistCard() {
  const [data, setData] = useState<VCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vc-daily", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/";
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API returned ${res.status}`);
      }
      const json: VCData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!viewerOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewerOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [viewerOpen]);

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="min-h-[200px] bg-muted/30 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-muted animate-spin" />
        </div>
        <div className="p-4">
          <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse mb-2" />
          <div className="h-3 w-1/2 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  const proxiedImageSrc = data
    ? `/api/vc-image?url=${encodeURIComponent(data.imageUrl)}`
    : "";

  if (error || !data) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 text-center">
        <p className="text-sm text-muted mb-3">{error || "Could not load Visual Capitalist image"}</p>
        <button
          onClick={fetchData}
          className="text-sm text-accent hover:text-accent/80 flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-card border border-border overflow-hidden group">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="block w-full text-left"
        >
          <div className="w-full max-w-4xl mx-auto bg-muted/20 rounded-lg overflow-hidden cursor-pointer hover:opacity-95 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxiedImageSrc}
              alt={data.title}
              className="block w-full h-auto object-contain"
            />
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors flex items-start gap-2">
              <BarChart3 className="h-4 w-4 mt-0.5 shrink-0 text-muted" />
              {data.title}
            </h3>
            <p className="mt-2 text-xs text-muted flex items-center gap-1">
              Visual Capitalist
              <ExternalLink className="h-3 w-3" />
            </p>
          </div>
        </button>
      </div>

      {viewerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="View document"
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] overflow-auto bg-card rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-4 pt-14">
              <div className="mb-4">
                <h2 className="font-semibold text-lg text-foreground pr-12">{data.title}</h2>
              </div>
              <div className="bg-muted/20 rounded-lg overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxiedImageSrc}
                  alt={data.title}
                  className="block w-full h-auto object-contain"
                />
              </div>
              <a
                href={data.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium"
              >
                Open full article on Visual Capitalist
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

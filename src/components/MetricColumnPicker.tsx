"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AVAILABLE_METRICS } from "@/lib/metrics";

interface MetricColumnPickerProps {
  visibleKeys: readonly string[];
  toggleKey: (key: string) => void;
  resetToDefault: () => void;
}

export default function MetricColumnPicker({
  visibleKeys,
  toggleKey,
  resetToDefault,
}: MetricColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(ev: MouseEvent) {
      if (!wrapRef.current?.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const vis = new Set(visibleKeys);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-card-hover transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4 text-muted shrink-0" aria-hidden />
        Columns
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[14rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-xl py-1 max-h-[min(22rem,calc(100vh-8rem))] overflow-y-auto"
          role="dialog"
          aria-label="Table columns"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Visible columns
            </p>
            <p className="text-[11px] text-muted mt-0.5 leading-snug">
              Order follows the checklist (new columns append when turned on).
            </p>
          </div>

          <ul className="py-1 px-2 space-y-0.5">
            {AVAILABLE_METRICS.map(({ key, label }) => (
              <li key={key}>
                <label className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-2 hover:bg-card-hover transition-colors">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-border accent-[var(--accent)] shrink-0"
                    checked={vis.has(key)}
                    onChange={() => toggleKey(key)}
                  />
                  <span className="text-sm text-foreground select-none">{label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={() => {
                resetToDefault();
                setOpen(false);
              }}
              className="text-xs font-medium text-accent hover:underline"
            >
              Reset to default
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

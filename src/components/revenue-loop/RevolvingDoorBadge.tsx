"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
  onClick: () => void;
  className?: string;
  label?: string;
}

/** Red warning badge for detected round-trip (revolving door) capital flows. */
export default function RevolvingDoorBadge({
  onClick,
  className = "",
  label = "Revolving door",
}: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Round-trip capital flow detected — click for detail"
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border border-red-500/50 bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors ${className}`}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

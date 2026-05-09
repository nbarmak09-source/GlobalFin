"use client";

import { useMemo, useState } from "react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase() || "?";
}

type Props = {
  name: string;
  imageUrl: string;
  alt?: string;
  className?: string;
  /** e.g. h-14 w-14 — size the outer ring; inner img matches */
  sizeClass?: string;
  /** Tailwind classes for the initials fallback (larger hero avatars may use text-sm) */
  initialsClassName?: string;
};

/**
 * Renders a headshot when `imageUrl` loads; on error or empty URL shows
 * initials (several notable investors have no stable free portrait on Commons).
 */
export function InvestorAvatar({
  name,
  imageUrl,
  alt,
  className = "",
  sizeClass = "h-14 w-14",
  initialsClassName = "text-[11px] font-semibold uppercase tracking-tight text-muted",
}: Props) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => initialsFromName(name), [name]);
  const src = imageUrl.trim();
  const showImg = src !== "" && !failed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border-2 border-border bg-card flex items-center justify-center ${sizeClass} ${className}`}
      aria-hidden={!alt && !showImg ? true : undefined}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={`select-none ${initialsClassName}`}>
          {initials}
        </span>
      )}
    </div>
  );
}

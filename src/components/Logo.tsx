/**
 * GCM HQ brand logo — logomark + optional wordmark.
 *
 * Logomark: three ascending rounded-corner bars (capital-markets / growth).
 * Export the standalone <LogoMark> if you only need the icon,
 * or <Logo> for the full lockup (icon + wordmark).
 */

/** Three ascending bars — the core brand mark. */
export function LogoMark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Bar 1 — short */}
      <rect x="1" y="14" width="5.5" height="8" rx="1.5" fill="#c9a227" />
      {/* Bar 2 — medium */}
      <rect x="8.25" y="9" width="5.5" height="13" rx="1.5" fill="#c9a227" />
      {/* Bar 3 — tall */}
      <rect x="15.5" y="2" width="5.5" height="20" rx="1.5" fill="#c9a227" />
    </svg>
  );
}

/**
 * Full logo lockup:  [mark]  GCM HQ
 *                           GLOBAL CAPITAL MARKETS  ← desktop only
 *
 * The `compact` prop hides the subtitle (for use in tight spaces / mobile).
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 select-none">
      <LogoMark size={22} className="shrink-0" />
      <span className="flex flex-col justify-center leading-none gap-[3px]">
        <span
          className="text-[15px] font-bold tracking-tight text-accent"
          style={{ fontFamily: "var(--font-serif-display), var(--font-sans-pro), sans-serif" }}
        >
          GCM{" "}
          <span className="font-extrabold">HQ</span>
        </span>
        {!compact && (
          <span
            className="hidden md:block text-[8.5px] font-semibold uppercase tracking-[0.18em] text-muted/70"
            style={{ fontFamily: "var(--font-sans-pro), sans-serif" }}
          >
            Global Capital Markets
          </span>
        )}
      </span>
    </span>
  );
}

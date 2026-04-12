/**
 * GCM HQ brand logo — logomark + optional wordmark.
 *
 * Logomark: wireframe globe (global markets) + ascending chart bars (finance).
 * Export the standalone <LogoMark> if you only need the icon,
 * or <Logo> for the full lockup (icon + wordmark).
 */

/** Globe + growth bars — global capital markets. */
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
      className={`text-accent ${className}`}
    >
      {/* Globe: sphere + meridian + equator */}
      <circle
        cx="11"
        cy="11"
        r="7.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse
        cx="11"
        cy="11"
        rx="3.2"
        ry="7.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M 3.5 11 H 18.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Finance: ascending bars (lower-right inside globe) */}
      <rect
        x="12"
        y="15.5"
        width="2.25"
        height="3"
        rx="0.45"
        fill="currentColor"
      />
      <rect
        x="14.75"
        y="13.5"
        width="2.25"
        height="5"
        rx="0.45"
        fill="currentColor"
      />
      <rect
        x="17.5"
        y="11"
        width="2.25"
        height="7.5"
        rx="0.45"
        fill="currentColor"
      />
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

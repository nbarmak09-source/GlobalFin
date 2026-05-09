/**
 * GlobalFin — vector identity only (no PNG lockups).
 * Crisp on retina, matches `--color-bg` (#0B0B0F), scales across sidebar / navbar / auth.
 */

export type GlobalFinBrandVariant =
  | "sidebar"
  | "navbar"
  | "navbarCompact"
  | "topbar"
  | "auth"
  | "welcome";

/** Globe + growth arc + bars — scales cleanly at any size. */
export function LogoMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-[var(--color-primary)] ${className}`}
    >
      {/* Ascending trajectory (behind globe) */}
      <path
        d="M2 18c4.5-6 9.5-8.5 20.25-10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.4}
      />
      {/* Globe */}
      <circle
        cx="11"
        cy="13"
        r="6.75"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <ellipse
        cx="11"
        cy="13"
        rx="3.15"
        ry="6.75"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path d="M4.25 13h13.5" stroke="currentColor" strokeWidth="1.35" />
      {/* Bars */}
      <rect x="13.25" y="15.75" width="2.05" height="3.25" rx="0.45" fill="currentColor" />
      <rect x="15.85" y="13.85" width="2.05" height="5.15" rx="0.45" fill="currentColor" />
      <rect x="18.45" y="11.5" width="2.05" height="7.5" rx="0.45" fill="currentColor" />
    </svg>
  );
}

function WordGLOBALFIN({
  sizePx,
}: {
  sizePx: number;
}) {
  return (
    <span
      className="leading-none whitespace-nowrap"
      style={{
        fontFamily: "var(--font-heading)",
        fontWeight: 700,
        letterSpacing: "-0.03em",
        fontSize: sizePx,
      }}
    >
      <span style={{ color: "var(--color-text)" }}>GLOBAL</span>
      <span style={{ color: "var(--color-primary)" }}>FIN</span>
    </span>
  );
}

/** Thin gold accent — mirrors printed lockup */
function BrandDivider({ wide }: { wide?: boolean }) {
  return (
    <div
      className={wide ? "w-48 max-w-[90%]" : "w-14"}
      style={{
        height: 1,
        marginLeft: "auto",
        marginRight: "auto",
        background:
          "linear-gradient(90deg, transparent 0%, var(--color-primary) 35%, var(--color-primary-light) 50%, var(--color-primary) 65%, transparent 100%)",
        opacity: 0.55,
      }}
      aria-hidden
    />
  );
}

export function GlobalFinBrand({
  variant = "navbar",
  className = "",
}: {
  variant?: GlobalFinBrandVariant;
  className?: string;
}) {
  if (variant === "sidebar") {
    return (
      <span className={`flex flex-col items-center justify-center ${className}`}>
        <LogoMark size={26} />
        <WordGLOBALFIN sizePx={11} />
      </span>
    );
  }

  if (variant === "navbarCompact") {
    return (
      <span className={`flex items-center gap-2 min-w-0 ${className}`}>
        <LogoMark size={22} />
        <WordGLOBALFIN sizePx={14} />
      </span>
    );
  }

  if (variant === "navbar") {
    return (
      <span className={`flex items-center gap-2.5 min-w-0 ${className}`}>
        <LogoMark size={26} />
        <WordGLOBALFIN sizePx={16} />
      </span>
    );
  }

  if (variant === "topbar") {
    return (
      <span className={`flex items-center gap-2.5 shrink-0 ${className}`}>
        <LogoMark size={28} />
        <WordGLOBALFIN sizePx={17} />
      </span>
    );
  }

  if (variant === "welcome") {
    return (
      <span className={`flex flex-col items-center gap-2 ${className}`}>
        <LogoMark size={40} />
        <WordGLOBALFIN sizePx={22} />
        <BrandDivider wide />
      </span>
    );
  }

  /* auth */
  return (
    <span className={`flex flex-col items-center gap-2 ${className}`}>
      <LogoMark size={48} />
      <WordGLOBALFIN sizePx={28} />
      <BrandDivider wide />
    </span>
  );
}

/**
 * Navbar: desktop vs compact widths handled by parent breakpoints.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return <GlobalFinBrand variant={compact ? "navbarCompact" : "navbar"} />;
}

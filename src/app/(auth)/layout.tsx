import Link from "next/link";
import { GlobalFinBrand } from "@/components/Logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center px-3 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.07) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
          <Link
            href="/"
            className="inline-flex flex-col items-center gap-3 rounded-xl px-2 py-1 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-label="GLOBALFIN Capital Markets — Home"
          >
            <GlobalFinBrand variant="auth" />
            {/* Tagline hidden on very narrow screens so auth forms stay above the fold */}
            <p
              className="hidden min-[360px]:block text-[10px] sm:text-[11px] uppercase tracking-[0.14em] max-w-[280px] leading-snug"
              style={{
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                opacity: 0.92,
              }}
            >
              Smarter Markets. Better Outcomes.
            </p>
          </Link>
        </div>

        <div className="space-y-6 sm:space-y-8">{children}</div>

        <div
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-6 px-1 text-center"
          style={{ fontSize: 11, color: "var(--color-muted)" }}
        >
          <span>Real-time market data</span>
          <span className="opacity-40 hidden sm:inline">·</span>
          <span>AI-powered research</span>
          <span className="opacity-40 hidden sm:inline">·</span>
          <span>Portfolio tracking</span>
        </div>
      </div>
    </div>
  );
}

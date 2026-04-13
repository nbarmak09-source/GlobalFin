import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center px-3 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.08) 0%, transparent 55%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Link
            href="/"
            className="flex flex-col items-center gap-3 transition-opacity duration-200 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-lg p-1"
          >
            <LogoMark size={40} />
            <span className="flex flex-col items-center gap-1">
              <span
                className="text-xl font-extrabold tracking-tight text-accent leading-none"
                style={{ fontFamily: "var(--font-serif-display), sans-serif" }}
              >
                GCM HQ
              </span>
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/70 leading-none"
                style={{ fontFamily: "var(--font-sans-pro), sans-serif" }}
              >
                Global Capital Markets
              </span>
            </span>
          </Link>
          <p className="text-sm text-muted text-center">
            Professional-grade market intelligence.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8">{children}</div>

        <div className="flex items-center gap-3 text-[11px] text-muted mt-6">
          <span>Real-time market data</span>
          <span className="opacity-40">·</span>
          <span>AI-powered research</span>
          <span className="opacity-40">·</span>
          <span>Portfolio tracking</span>
        </div>
      </div>
    </div>
  );
}

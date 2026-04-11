import Link from "next/link";
import { Globe2 } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center px-3 py-8 sm:px-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.08) 0%, transparent 55%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold font-serif text-accent transition-opacity duration-200 hover:opacity-80"
          >
            <Globe2 className="h-6 w-6" />
            Global Capital Markets HQ
          </Link>
          <p className="text-sm text-muted text-center">
            Professional-grade market intelligence.
          </p>
        </div>

        <div className="mt-6 space-y-6 sm:mt-8 sm:space-y-8">{children}</div>

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

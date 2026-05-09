import type { Metadata } from "next"
import Link from "next/link"
import { InvestorAvatar } from "@/components/research/InvestorAvatar"
import { SUPER_INVESTORS } from "@/lib/superInvestors"

export const metadata: Metadata = {
  title: "Super Investors | GlobalFin",
  description: "Track 13F filings from the world's top institutional investors.",
}

const STRATEGY_COLORS: Record<string, string> = {
  Value: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Activist: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Long/Short": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Quant: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Growth: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
}

function strategyClass(strategy: string): string {
  return (
    STRATEGY_COLORS[strategy] ??
    "bg-accent/10 text-accent border-accent/20"
  )
}

export default function SuperInvestorsPage() {
  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Super Investors</h1>
        <p className="text-[13px] text-muted mt-1">
          Track 13F filings from the world&apos;s top institutional investors
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SUPER_INVESTORS.map((investor) => (
          <Link
            key={investor.slug}
            href={`/research/super-investors/${investor.slug}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors cursor-pointer block"
          >
            {/* Avatar + name/fund */}
            <div className="flex items-center gap-3">
              <InvestorAvatar
                name={investor.name}
                imageUrl={investor.imageUrl}
                alt={investor.name}
                sizeClass="h-14 w-14"
              />
              <div className="min-w-0">
                <div className="font-semibold text-[14px] text-foreground leading-tight truncate">
                  {investor.name}
                </div>
                <div className="text-[11px] text-muted mt-0.5 truncate">{investor.fund}</div>
              </div>
            </div>

            {/* Strategy tag */}
            <div className="mt-3">
              <span
                className={`inline-block border rounded-full px-2 py-0.5 text-[10px] font-medium ${strategyClass(investor.strategy)}`}
              >
                {investor.strategy}
              </span>
            </div>

            {/* Description */}
            <p className="text-[12px] text-muted mt-3 leading-relaxed line-clamp-2">
              {investor.description}
            </p>

            {/* Bottom row */}
            <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
              <span className="text-[11px] text-accent">View holdings →</span>
              <span className="text-[10px] text-muted border border-border/50 rounded px-1.5 py-0.5">
                13F
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

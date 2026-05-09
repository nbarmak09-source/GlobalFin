import { NextRequest, NextResponse } from "next/server"
import { SUPER_INVESTORS, type SuperInvestor } from "@/lib/superInvestors"

const FMP_BASE = "https://financialmodelingprep.com/api/v3"

function getApiKey(): string | null {
  const k = process.env.FMP_API_KEY?.trim()
  return k || null
}

interface FmpHolding {
  date?: string
  cik?: string
  cusip?: string
  name?: string
  shares?: number
  value?: number
  industry?: string
  weight?: number
}

export interface Holding {
  name: string
  cusip: string
  shares: number
  value: number
  percentPortfolio: number
}

export interface InvestorDetailResponse {
  investor: SuperInvestor
  filingDate: string
  totalValue: number
  positionCount: number
  topHoldings: Holding[]
  allHoldings: Holding[]
  industryBreakdown: { industry: string; pct: number }[]
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number.parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const investor = SUPER_INVESTORS.find((i) => i.slug === slug)
  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: "FMP_API_KEY not configured" }, { status: 503 })
  }

  const holdingsUrl = `${FMP_BASE}/form-13f/${encodeURIComponent(investor.cik)}?apikey=${encodeURIComponent(apiKey)}`
  const datesUrl = `${FMP_BASE}/form-13f/${encodeURIComponent(investor.cik)}/dates?apikey=${encodeURIComponent(apiKey)}`

  let rawHoldings: FmpHolding[] = []

  try {
    const [holdingsRes] = await Promise.all([
      fetch(holdingsUrl, { next: { revalidate: 86400 } }),
      fetch(datesUrl, { next: { revalidate: 86400 } }),
    ])

    if (holdingsRes.ok) {
      const json: unknown = await holdingsRes.json()
      if (Array.isArray(json)) {
        rawHoldings = json as FmpHolding[]
      }
    }
  } catch (e) {
    console.error(`[/api/super-investors/${slug}] FMP fetch failed:`, e)
    return NextResponse.json({ error: "Failed to fetch 13F data" }, { status: 502 })
  }

  if (rawHoldings.length === 0) {
    return NextResponse.json({ error: "No 13F holdings found for this filer" }, { status: 404 })
  }

  // Group by most recent date
  const allDates = rawHoldings
    .map((h) => h.date ?? "")
    .filter(Boolean)
    .sort()
  const mostRecentDate = allDates[allDates.length - 1] ?? ""
  const latestHoldings = rawHoldings.filter((h) => h.date === mostRecentDate)

  // Deduplicate by cusip, summing values/shares for the same cusip
  const cusipMap = new Map<string, FmpHolding>()
  for (const h of latestHoldings) {
    const key = ((h.cusip ?? "").toUpperCase()) || (h.name ?? "")
    if (!key) continue
    const existing = cusipMap.get(key)
    if (existing) {
      existing.shares = toNum(existing.shares) + toNum(h.shares)
      existing.value = toNum(existing.value) + toNum(h.value)
    } else {
      cusipMap.set(key, { ...h })
    }
  }

  const deduplicated = Array.from(cusipMap.values())
  const totalValue = deduplicated.reduce((sum, h) => sum + toNum(h.value), 0)
  const positionCount = deduplicated.length

  // Sort by value descending
  deduplicated.sort((a, b) => toNum(b.value) - toNum(a.value))

  const allHoldings: Holding[] = deduplicated.map((h) => ({
    name: (h.name ?? "").slice(0, 60),
    cusip: h.cusip ?? "",
    shares: toNum(h.shares),
    value: toNum(h.value),
    percentPortfolio: totalValue > 0 ? (toNum(h.value) / totalValue) * 100 : 0,
  }))

  const topHoldings = allHoldings.slice(0, 10)

  // Industry breakdown
  const industryMap = new Map<string, number>()
  for (const h of deduplicated) {
    const ind = (h.industry ?? "").trim()
    if (!ind) continue
    industryMap.set(ind, (industryMap.get(ind) ?? 0) + toNum(h.value))
  }

  const industryBreakdown =
    industryMap.size > 0
      ? Array.from(industryMap.entries())
          .map(([industry, val]) => ({
            industry,
            pct: totalValue > 0 ? (val / totalValue) * 100 : 0,
          }))
          .sort((a, b) => b.pct - a.pct)
      : []

  const response: InvestorDetailResponse = {
    investor,
    filingDate: mostRecentDate,
    totalValue,
    positionCount,
    topHoldings,
    allHoldings,
    industryBreakdown,
  }

  return NextResponse.json(response)
}

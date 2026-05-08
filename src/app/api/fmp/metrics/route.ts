import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const cache = new Map<string, { data: unknown; at: number }>()
const TTL = 60_000 * 30

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim().toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const cacheKey = symbol
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data)

  try {
    const result = (await yf.quoteSummary(
      symbol,
      {
        modules: [
          'summaryDetail',
          'defaultKeyStatistics',
          'financialData',
          'price',
        ],
      },
      { validateResult: false }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any

    const detail = result.summaryDetail   ?? {}
    const stats  = result.defaultKeyStatistics ?? {}
    const fin    = result.financialData   ?? {}
    const price  = result.price           ?? {}

    // Use today as the single date for current-period key metrics
    const today = new Date().toISOString().split('T')[0]

    const row: Record<string, unknown> = {
      date: today,

      // Valuation ratios
      peRatio:       num(detail.trailingPE)        ?? num(stats.trailingEps),
      pbRatio:       num(stats.priceToBook),
      evToEbitda:    num(stats.enterpriseToEbitda),
      evToSales:     num(stats.enterpriseToRevenue),

      // Returns
      roe:           num(fin.returnOnEquity),
      roa:           num(fin.returnOnAssets),
      roic:          num(stats.returnOnInvestedCapital) ?? null,

      // Leverage
      debtToEquity:  fin.debtToEquity != null ? num(fin.debtToEquity) : null,
      currentRatio:  num(fin.currentRatio),

      // Income / size
      marketCap:     num(price.marketCap) ?? num(detail.marketCap),

      // Yield
      dividendYield: num(detail.dividendYield) ?? num(detail.trailingAnnualDividendYield),
    }

    // Wrap in array — charting page expects an array of rows
    const data = [row]
    cache.set(cacheKey, { data, at: Date.now() })
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/fmp/metrics] Yahoo error:', msg)
    return NextResponse.json(
      { error: `Could not load key metrics for ${symbol}: ${msg}` },
      { status: 502 }
    )
  }
}

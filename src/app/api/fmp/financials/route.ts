import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const cache = new Map<string, { data: unknown; at: number }>()
const TTL = 60_000 * 30 // 30 minutes

// ── Key mapping: Yahoo fundamentalsTimeSeries keys → our lib/metrics.ts keys ──
// fundamentalsTimeSeries returns one object per period; each key is a raw number.
const YF_TO_METRIC: Record<string, string> = {
  // Income statement
  totalRevenue:                  'revenue',
  grossProfit:                   'grossProfit',
  operatingIncome:               'operatingIncome',
  ebitda:                        'ebitda',
  normalizedEBITDA:              'ebitda',           // fallback
  netIncome:                     'netIncome',
  researchAndDevelopment:        'researchAndDevelopmentExpenses',
  dilutedEPS:                    'epsdiluted',
  interestExpense:               'interestExpense',
  taxProvision:                  'incomeTaxExpense',
  // Balance sheet
  totalAssets:                   'totalAssets',
  stockholdersEquity:            'totalStockholdersEquity',
  totalDebt:                     'totalDebt',
  cashAndCashEquivalents:        'cashAndCashEquivalents',
  // Cash flow
  operatingCashFlow:             'operatingCashFlow',
  cashFlowFromContinuingOperatingActivities: 'operatingCashFlow',
  freeCashFlow:                  'freeCashFlow',
  capitalExpenditure:            'capitalExpenditure',
  capitalExpenditureReported:    'capitalExpenditure',
  commonStockDividendsPaid:      'dividendsPaid',
  repurchaseOfCapitalStock:      'commonStockRepurchased',
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function rowToDate(r: Record<string, unknown>): string {
  const d = r.date
  if (d instanceof Date) return d.toISOString().split('T')[0]
  if (typeof d === 'number') return new Date(d * 1000).toISOString().split('T')[0]
  if (typeof d === 'string') return d.split('T')[0]
  return ''
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim().toUpperCase()
  const period = req.nextUrl.searchParams.get('period') ?? 'annual'

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const cacheKey = `${symbol}:${period}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data)

  try {
    // fundamentalsTimeSeries returns an array of rows, one per fiscal period.
    // Each row has a `date` field and then all available financial keys.
    const type = period === 'quarter' ? 'quarterly' : 'annual'
    const rows = (await yf.fundamentalsTimeSeries(
      symbol,
      {
        period1: new Date('2012-01-01'),
        period2: new Date(),
        type,
        module: 'all',
      },
      { validateResult: false }
    )) as Record<string, unknown>[]

    if (!rows?.length) {
      return NextResponse.json(
        { error: `No financial data found for ${symbol} on Yahoo Finance.` },
        { status: 404 }
      )
    }

    // Map each row to our expected metric key names
    const mapped = rows
      .map(r => {
        const date = rowToDate(r)
        if (!date) return null

        const out: Record<string, unknown> = { date }

        // Direct key mapping
        for (const [yfKey, metricKey] of Object.entries(YF_TO_METRIC)) {
          const v = num(r[yfKey])
          if (v !== null && out[metricKey] == null) {
            // capitalExpenditure in Yahoo is often negative (cash outflow) — store as positive
            out[metricKey] = metricKey === 'capitalExpenditure' ? Math.abs(v) : v
          }
        }

        // Derived ratios — compute from the mapped values
        const rev = num(out['revenue'] as number)
        const gp  = num(out['grossProfit'] as number)
        const oi  = num(out['operatingIncome'] as number)
        const eb  = num(out['ebitda'] as number)
        const ni  = num(out['netIncome'] as number)
        const cce = num(out['cashAndCashEquivalents'] as number)
        const td  = num(out['totalDebt'] as number)
        const ocf = num(out['operatingCashFlow'] as number)
        const cap = num(out['capitalExpenditure'] as number)

        if (rev && rev !== 0) {
          if (gp  != null) out['grossProfitRatio']       = gp  / rev
          if (oi  != null) out['operatingIncomeRatio']   = oi  / rev
          if (eb  != null) out['ebitdaratio']            = eb  / rev
          if (ni  != null) out['netIncomeRatio']         = ni  / rev
        }
        if (cce != null && td != null) out['netCash'] = cce - td

        // freeCashFlow fallback: operating - capex
        if (out['freeCashFlow'] == null && ocf != null && cap != null) {
          out['freeCashFlow'] = ocf - cap
        }

        return out
      })
      .filter((r): r is Record<string, unknown> => r !== null)
      .sort((a, b) =>
        new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
      )

    cache.set(cacheKey, { data: mapped, at: Date.now() })
    return NextResponse.json(mapped)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/fmp/financials] Yahoo error:', msg)
    return NextResponse.json(
      { error: `Could not load financial data for ${symbol}: ${msg}` },
      { status: 502 }
    )
  }
}

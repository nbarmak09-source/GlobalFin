import { NextRequest, NextResponse } from 'next/server'

const FMP_KEY = process.env.FMP_API_KEY?.trim()

const cache = new Map<string, { data: unknown; at: number }>()
const TTL = 60_000 * 5 // 5 minutes

function fmpErrorMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const rec = body as Record<string, unknown>
  const legacy = rec['Error Message']
  if (typeof legacy === 'string') return legacy
  const nested = rec.error
  if (typeof nested === 'string') return nested
  return null
}

function normalizeRow(r: Record<string, unknown>): {
  symbol: string
  name: string
  exchange: string
} | null {
  const symbol = typeof r.symbol === 'string' ? r.symbol.trim() : ''
  if (!symbol) return null
  const name =
    typeof r.name === 'string'
      ? r.name
      : typeof r.companyName === 'string'
        ? r.companyName
        : ''
  const exchange =
    typeof r.exchangeShortName === 'string'
      ? r.exchangeShortName
      : typeof r.exchange === 'string'
        ? r.exchange
        : typeof r.stockExchange === 'string'
          ? r.stockExchange
          : ''
  return { symbol, name, exchange }
}

async function fetchStableSearch(path: 'search-symbol' | 'search-name', query: string) {
  const url = `https://financialmodelingprep.com/stable/${path}?query=${encodeURIComponent(query)}&limit=10&apikey=${encodeURIComponent(FMP_KEY!)}`
  const res = await fetch(url, { cache: 'no-store' })
  const data: unknown = await res.json()
  return { res, data }
}

function mergeResults(rows: Record<string, unknown>[]) {
  const seen = new Set<string>()
  const out: { symbol: string; name: string; exchange: string }[] = []
  for (const r of rows) {
    const row = normalizeRow(r)
    if (!row) continue
    const k = `${row.symbol}\u0000${row.exchange}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(row)
    if (out.length >= 10) break
  }
  return out
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 1) return NextResponse.json([])

  if (!FMP_KEY) {
    return NextResponse.json(
      { error: 'FMP_API_KEY is not set. Add it to .env.local (see .env.example).' },
      { status: 503 }
    )
  }

  const cacheKey = q.toLowerCase()
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data)

  try {
    const [sym, name] = await Promise.all([
      fetchStableSearch('search-symbol', q),
      fetchStableSearch('search-name', q),
    ])

    const symOk = sym.res.ok && Array.isArray(sym.data)
    const nameOk = name.res.ok && Array.isArray(name.data)

    if (!symOk && !nameOk) {
      const body = sym.data ?? name.data
      const fmpErr = fmpErrorMessage(sym.data) ?? fmpErrorMessage(name.data)
      console.error('[/api/fmp/search] FMP stable search failed', sym.res.status, name.res.status, fmpErr ?? body)
      return NextResponse.json(
        {
          error:
            fmpErr ??
            'Financial Modeling Prep rejected the search request (invalid key or plan).',
        },
        { status: 502 }
      )
    }

    const combined: Record<string, unknown>[] = []
    if (symOk) combined.push(...(sym.data as Record<string, unknown>[]))
    if (nameOk) combined.push(...(name.data as Record<string, unknown>[]))

    const results = mergeResults(combined)

    cache.set(cacheKey, { data: results, at: Date.now() })
    return NextResponse.json(results)
  } catch (err) {
    console.error('[/api/fmp/search]', err)
    return NextResponse.json({ error: 'Company search failed.' }, { status: 502 })
  }
}

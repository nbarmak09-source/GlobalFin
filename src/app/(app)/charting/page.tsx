'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { METRICS } from '@/lib/metrics'

// ── Types ──────────────────────────────────────────────────────────────────
interface Company  { symbol: string; name: string; exchange: string }
interface MetricDef { label: string; key: string; source: string; format: string; description: string }
type Period    = 'annual' | 'quarter'
type Scale     = 'K' | 'M' | 'B'
type ChartType = 'bar' | 'line' | 'area'

interface MetricChartOptions {
  chartType: ChartType
  visible: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────
const SCALE_DIV  = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }
const ACCENT     = 'var(--accent)'
const LINE_COLOR = '#4ade80'
const PCT_COLOR  = '#f97316'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(date: string, period: Period) {
  const d = new Date(date)
  if (period === 'quarter') {
    const q = Math.ceil((d.getMonth() + 1) / 3)
    return `Q${q} '${String(d.getFullYear()).slice(2)}`
  }
  return String(d.getFullYear())
}

function fmtVal(v: number | null, format: string, scale: Scale): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  if (format === 'percent') return `${v.toFixed(1)}%`
  if (format === 'ratio')   return v.toFixed(2)
  const d = SCALE_DIV[scale]
  const s = v / d
  return `$${s >= 1000 ? s.toLocaleString(undefined, { maximumFractionDigits: 0 }) : s.toFixed(1)}${scale}`
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TBtn({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title?: string
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: '3px 9px',
        fontSize: '0.72rem',
        fontWeight: active ? 700 : 400,
        fontFamily: 'var(--font-mono)',
        background: active ? ACCENT : 'var(--bg-elevated)',
        color: active ? '#000' : 'var(--text-secondary)',
        border: `1px solid ${active ? ACCENT : 'var(--border-strong)'}`,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 80ms',
        lineHeight: 1.8,
      }}
    >
      {children}
    </button>
  )
}

function CompanySearch({ value, onChange }: { value: Company | null; onChange: (c: Company | null) => void }) {
  const [q,          setQ]          = useState('')
  const [results,    setResults]    = useState<Company[]>([])
  const [open,       setOpen]       = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [searchErr,  setSearchErr]  = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)
    if (!q.trim()) {
      setResults([])
      setSearchErr(null)
      return
    }
    setBusy(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/fmp/search?q=${encodeURIComponent(q)}`)
        const data: unknown = await res.json()
        if (!res.ok && typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
          setSearchErr((data as { error: string }).error)
          setResults([])
          return
        }
        if (!res.ok) {
          setSearchErr('Company search failed.')
          setResults([])
          return
        }
        if (!Array.isArray(data)) {
          setSearchErr(null)
          setResults([])
          return
        }
        setSearchErr(null)
        setResults(data as Company[])
        if (data.length > 0) setOpen(true)
      } catch {
        setSearchErr('Network error.')
        setResults([])
      } finally {
        setBusy(false)
      }
    }, 260)
  }, [q])

  return (
    <div style={{ position: 'relative', flex: '0 0 260px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-base)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 10px', height: 36,
      }}>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="9" cy="9" r="6"/><line x1="14" y1="14" x2="18" y2="18"/>
        </svg>
        {value && !open ? (
          <>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: ACCENT, fontFamily: 'var(--font-mono)' }}>{value.symbol}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.name}</span>
            <button onClick={() => { onChange(null); setQ(''); setSearchErr(null); setResults([]) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>
          </>
        ) : (
          <input
            autoFocus={open}
            placeholder="Search ticker or company…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 160)}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.8rem', flex: 1 }}
          />
        )}
        {busy && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>…</span>}
      </div>

      {searchErr && (
        <p style={{ margin: '6px 2px 0', fontSize: '0.68rem', color: 'var(--red)', lineHeight: 1.35 }}>
          {searchErr}
        </p>
      )}

      {open && results.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 80,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          padding: '4px 0', margin: 0, listStyle: 'none', maxHeight: 260, overflowY: 'auto',
        }}>
          {results.map(r => (
            <li key={`${r.symbol}-${r.exchange ?? ''}`} onMouseDown={() => { onChange(r); setQ(''); setOpen(false); setSearchErr(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: ACCENT, minWidth: 50 }}>{r.symbol}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{r.exchange}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MetricSearch({ selected, onChange }: { selected: string[]; onChange: (keys: string[]) => void }) {
  const [q,    setQ]    = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const lq = q.toLowerCase()
    return lq ? METRICS.filter(m => m.label.toLowerCase().includes(lq) || m.description.toLowerCase().includes(lq)) : METRICS
  }, [q])

  const grouped = useMemo(() => {
    const g: Record<string, MetricDef[]> = {}
    for (const m of filtered) { (g[m.source] ??= []).push(m) }
    return g
  }, [filtered])

  const SOURCE_LABELS: Record<string, string> = {
    income: 'Income Statement', balance: 'Balance Sheet',
    cashflow: 'Cash Flow', metrics: 'Key Metrics & Ratios',
  }

  const toggle = (key: string) => {
    onChange(selected.includes(key)
      ? selected.filter(k => k !== key)
      : selected.length < 2 ? [...selected, key] : [selected[1], key]
    )
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          background: 'var(--bg-base)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)', padding: '4px 10px', minHeight: 36, cursor: 'pointer',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="9" cy="9" r="6"/><line x1="14" y1="14" x2="18" y2="18"/>
        </svg>
        {selected.map((key, i) => {
          const m = METRICS.find(x => x.key === key)
          return m ? (
            <span key={key} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: i === 0 ? ACCENT : LINE_COLOR,
              color: '#000', borderRadius: 3, padding: '2px 7px',
              fontSize: '0.7rem', fontWeight: 600,
            }}>
              {m.label}
              <button onClick={e => { e.stopPropagation(); toggle(key) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.55)', lineHeight: 1, padding: 0, fontSize: '0.9rem' }}>×</button>
            </span>
          ) : null
        })}
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {selected.length === 0 ? 'Select & search metrics…' : '+ add metric'}
        </span>
      </div>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 80,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
            maxHeight: 380, overflowY: 'auto',
          }}
        >
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>
            <input
              autoFocus
              placeholder="Search 35+ metrics…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)', fontSize: '0.8rem', padding: '5px 8px', outline: 'none',
              }}
            />
          </div>
          {Object.entries(grouped).map(([src, items]) => (
            <div key={src}>
              <div style={{
                padding: '6px 12px 4px', fontSize: '0.62rem', fontWeight: 700,
                letterSpacing: '0.09em', textTransform: 'uppercase',
                color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}>
                {SOURCE_LABELS[src] ?? src}
              </div>
              {items.map(m => {
                const isSel = selected.includes(m.key)
                const idx   = selected.indexOf(m.key)
                return (
                  <div key={m.key} onClick={() => toggle(m.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px', cursor: 'pointer',
                      background: isSel ? 'var(--bg-active)' : 'transparent',
                      borderLeft: isSel ? `2px solid ${idx === 0 ? ACCENT : LINE_COLOR}` : '2px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSel ? 'var(--bg-active)' : 'transparent' }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSel ? 600 : 400 }}>{m.label}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{m.description}</div>
                    </div>
                    {isSel && (
                      <span style={{ fontSize: '0.65rem', color: idx === 0 ? ACCENT : LINE_COLOR, fontWeight: 700, marginLeft: 10 }}>✓</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineSlider({ min, max, value, onChange, labels }: {
  min: number; max: number; value: [number, number]
  onChange: (v: [number, number]) => void; labels: string[]
}) {
  const track    = useRef<HTMLDivElement>(null)
  const dragging = useRef<'left' | 'right' | null>(null)

  const pct = (v: number) => ((v - min) / (max - min)) * 100

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !track.current) return
    const rect  = track.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const raw   = Math.round(ratio * (max - min) + min)
    if (dragging.current === 'left') {
      onChange([Math.min(raw, value[1] - 1), value[1]])
    } else {
      onChange([value[0], Math.max(raw, value[0] + 1)])
    }
  }, [value, min, max, onChange])

  const handleMouseUp = useCallback(() => { dragging.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const leftLabel  = labels[value[0] - min] ?? String(value[0])
  const rightLabel = labels[value[1] - min] ?? String(value[1])

  const Handle = ({ side }: { side: 'left' | 'right' }) => {
    const pos = side === 'left' ? pct(value[0]) : pct(value[1])
    return (
      <div
        onMouseDown={e => { e.preventDefault(); dragging.current = side }}
        style={{
          position: 'absolute',
          left: `${pos}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14,
          borderRadius: '50%',
          background: ACCENT,
          border: '2px solid #000',
          cursor: 'ew-resize',
          zIndex: 3,
          boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
        }}
      />
    )
  }

  return (
    <div style={{ padding: '4px 10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
          borderRadius: 3, padding: '2px 6px',
        }}>{leftLabel}</span>
        <span style={{
          fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
          borderRadius: 3, padding: '2px 6px',
        }}>{rightLabel}</span>
      </div>

      <div ref={track} style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: '0', height: 4, top: '50%', transform: 'translateY(-50%)', background: 'var(--border-strong)', borderRadius: 2 }} />
        <div style={{
          position: 'absolute',
          left: `${pct(value[0])}%`,
          width: `${pct(value[1]) - pct(value[0])}%`,
          height: 4, top: '50%', transform: 'translateY(-50%)',
          background: ACCENT, borderRadius: 2, opacity: 0.7,
        }} />
        {labels.map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${pct(i + min)}%`,
            top: '50%', transform: 'translate(-50%, -50%)',
            width: 4, height: 4, borderRadius: '50%',
            background: i + min >= value[0] && i + min <= value[1] ? ACCENT : 'var(--border-strong)',
            opacity: 0.5, zIndex: 1,
          }} />
        ))}
        <Handle side="left" />
        <Handle side="right" />
      </div>
    </div>
  )
}

const chartIcons = {
  bar: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1" y="6" width="4" height="9" /><rect x="6" y="3" width="4" height="12" /><rect x="11" y="1" width="4" height="14" />
    </svg>
  ),
  line: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <polyline points="1,13 5,7 9,10 13,3 15,5" />
    </svg>
  ),
  area: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.85" aria-hidden>
      <polygon points="1,15 1,13 5,7 9,10 13,3 15,5 15,15" />
    </svg>
  ),
}

function MetricSeriesToolbar({
  chartType,
  visible,
  colorActive,
  onSetType,
  onToggleVisible,
  onRemove,
}: {
  chartType: ChartType
  visible: boolean
  colorActive: string
  onSetType: (t: ChartType) => void
  onToggleVisible: () => void
  onRemove: () => void
}) {
  const IconBtn = ({ type, title }: { type: ChartType; title: string }) => (
    <button
      type="button"
      title={title}
      onClick={() => onSetType(type)}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: chartType === type ? colorActive : 'var(--bg-elevated)',
        border: `1px solid ${chartType === type ? colorActive : 'var(--border-strong)'}`,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: chartType === type ? '#000' : 'var(--text-secondary)',
      }}
    >
      {chartIcons[type]}
    </button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <IconBtn type="line" title="Line" />
      <IconBtn type="bar" title="Bar" />
      <IconBtn type="area" title="Area" />
      <button
        type="button"
        title={visible ? 'Hide series' : 'Show series'}
        onClick={onToggleVisible}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: visible ? 'var(--bg-elevated)' : 'var(--bg-hover)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: visible ? 'var(--text-secondary)' : 'var(--text-muted)',
          opacity: visible ? 1 : 0.55,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {visible ? (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          )}
        </svg>
      </button>
      <button
        type="button"
        title="Remove metric"
        onClick={onRemove}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }} aria-hidden>×</span>
      </button>
    </div>
  )
}

function ChartTooltip({ active, payload, label, scale, metricKeys }: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string }[]
  label?: string
  scale: Scale
  metricKeys: string[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px',
      boxShadow: 'var(--shadow-md)', minWidth: 170,
    }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>{label}</p>
      {payload.map(p => {
        const isPct    = String(p.dataKey).startsWith('__pct_')
        const baseKey  = isPct ? String(p.dataKey).replace('__pct_', '') : String(p.dataKey)
        const def      = METRICS.find(m => m.key === baseKey)
        return (
          <p key={p.dataKey} style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', margin: '3px 0', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>
              {isPct ? `${def?.label ?? baseKey} % Chg.` : (def?.label ?? p.dataKey)}
            </span>
            <span style={{ color: p.color, fontWeight: 600 }}>
              {isPct ? `${p.value?.toFixed(1)}%` : (def ? fmtVal(p.value, def.format, scale) : p.value)}
            </span>
          </p>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ChartingPage() {
  const [company,   setCompany]   = useState<Company | null>(null)
  const [metrics,   setMetrics]   = useState<string[]>(['revenue', 'netIncomeRatio'])
  const [period,    setPeriod]    = useState<Period>('annual')
  const [scale,     setScale]     = useState<Scale>('B')
  const [metricChartOptions, setMetricChartOptions] = useState<Record<string, MetricChartOptions>>({})
  const [showPct,   setShowPct]   = useState(false)
  const [indexZero, setIndexZero] = useState(false)
  const [rows,      setRows]      = useState<Record<string, unknown>[]>([])
  const [mRows,     setMRows]     = useState<Record<string, unknown>[]>([])
  const [loading,   setLoading]   = useState(false)
  const [range,     setRange]     = useState<[number, number]>([0, 9])
  const [dataErr,   setDataErr]   = useState<string | null>(null)

  useEffect(() => {
    if (!company) return
    setLoading(true)
    setDataErr(null)
    const sym = company.symbol
    const p   = period

    const load = async (path: string) => {
      const res = await fetch(`/api/${path}?symbol=${sym}&period=${p}`)
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
            ? (body as { error: string }).error
            : `Request failed (HTTP ${res.status}).`
        throw new Error(msg)
      }
      return Array.isArray(body) ? body : []
    }

    Promise.allSettled([load('fmp/financials'), load('fmp/metrics')])
      .then(([fin, met]) => {
        const finData = fin.status === 'fulfilled' ? fin.value : []
        const metData = met.status === 'fulfilled' ? met.value : []
        setRows(finData)
        setMRows(metData)
        const len = Math.max(finData.length, metData.length)
        setRange([0, Math.max(0, len - 1)])
        if (fin.status === 'rejected' && met.status === 'rejected') {
          setDataErr(fin.reason?.message ?? met.reason?.message ?? 'Failed to fetch financial data.')
        } else if (fin.status === 'rejected') {
          setDataErr(`Statements: ${fin.reason?.message ?? 'failed'}`)
        } else if (met.status === 'rejected') {
          setDataErr(`Key metrics: ${met.reason?.message ?? 'failed'}`)
        }
      })
      .finally(() => setLoading(false))
  }, [company, period])

  useEffect(() => {
    setMetricChartOptions(prev => {
      const next: Record<string, MetricChartOptions> = {}
      for (let i = 0; i < metrics.length; i++) {
        const key = metrics[i]!
        const existing = prev[key]
        if (existing) {
          next[key] = { ...existing }
        } else {
          next[key] = { chartType: i === 0 ? 'bar' : 'line', visible: true }
        }
      }
      return next
    })
  }, [metrics])

  const allData = useMemo(() => {
    const byDate: Record<string, Record<string, unknown>> = {}
    for (const r of rows)  { byDate[r.date as string] = { ...byDate[r.date as string], ...r } }
    for (const r of mRows) { byDate[r.date as string] = { ...byDate[r.date as string], ...r } }
    return Object.values(byDate).sort((a, b) =>
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    )
  }, [rows, mRows])

  const sliced = useMemo(() => allData.slice(range[0], range[1] + 1), [allData, range])

  const chartData = useMemo(() => {
    const def0 = METRICS.find(m => m.key === metrics[0])
    const def1 = METRICS.find(m => m.key === metrics[1])

    return sliced.map((row, i) => {
      const point: Record<string, unknown> = { date: fmtDate(row.date as string, period) }

      for (const [idx, key] of metrics.entries()) {
        const def = idx === 0 ? def0 : def1
        if (!def) continue
        let raw = typeof row[key] === 'number' ? (row[key] as number) : null
        if (raw === null) { point[key] = null; continue }

        if (def.format !== 'percent' && def.format !== 'ratio') {
          raw = raw / SCALE_DIV[scale]
        } else if (def.format === 'percent') {
          raw = raw * 100
        }

        if (indexZero && i > 0) {
          const first = sliced[0][key]
          if (typeof first === 'number' && first !== 0) raw = ((raw - first) / Math.abs(first)) * 100
        }

        point[key] = +raw.toFixed(2)
      }

      if (showPct && metrics[0] && i > 0) {
        const prev = sliced[i - 1][metrics[0]]
        const curr = sliced[i][metrics[0]]
        if (typeof prev === 'number' && typeof curr === 'number' && prev !== 0) {
          point[`__pct_${metrics[0]}`] = +((curr - prev) / Math.abs(prev) * 100).toFixed(2)
        } else {
          point[`__pct_${metrics[0]}`] = null
        }
      }

      return point
    })
  }, [sliced, metrics, scale, period, showPct, indexZero])

  const timelineLabels = allData.map(r => fmtDate(r.date as string, period))
  const maxRange       = Math.max(0, allData.length - 1)

  const visibleMetricKeys = useMemo(
    () => metrics.filter(k => metricChartOptions[k]?.visible !== false),
    [metrics, metricChartOptions],
  )

  const leftDef  = METRICS.find(m => m.key === visibleMetricKeys[0])
  const showPctOnChart =
    showPct &&
    Boolean(metrics[0]) &&
    metricChartOptions[metrics[0]!]?.visible !== false
  const needsRightAxis =
    visibleMetricKeys.length > 1 || showPctOnChart

  const Toggle = ({ on, onToggle, color = ACCENT }: { on: boolean; onToggle: () => void; color?: string }) => (
    <div onClick={onToggle} style={{
      width: 28, height: 16, borderRadius: 8,
      background: on ? color : 'var(--bg-hover)',
      position: 'relative', cursor: 'pointer', transition: 'background 150ms', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 14 : 2, width: 12, height: 12,
        borderRadius: '50%', background: '#000', transition: 'left 150ms',
      }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 20px 40px' }}>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Charting</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Visualise financial metrics from 10-K and 10-Q filings
        </p>
      </div>

      {/* Search row */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap',
        marginBottom: 10, padding: '10px 12px',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}>
        <CompanySearch value={company} onChange={setCompany} />
        <MetricSearch  selected={metrics} onChange={setMetrics} />
      </div>

      {/* Per-metric series options + global toolbar */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
      }}>
        {metrics.length > 0 && metrics.map((key, rowIdx) => {
          const def = METRICS.find(m => m.key === key)
          if (!def) return null
          const opt = metricChartOptions[key] ?? { chartType: rowIdx === 0 ? 'bar' : 'line', visible: true }
          const colorActive = rowIdx === 0 ? ACCENT : LINE_COLOR
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderBottom: rowIdx < metrics.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    flexShrink: 0,
                    background: colorActive,
                    opacity: opt.visible ? 1 : 0.35,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: opt.visible ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    {def.label}
                  </div>
                  <div style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    marginTop: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {def.description}
                  </div>
                </div>
              </div>
              <MetricSeriesToolbar
                chartType={opt.chartType}
                visible={opt.visible}
                colorActive={colorActive}
                onSetType={t => {
                  setMetricChartOptions(o => ({
                    ...o,
                    [key]: { ...opt, chartType: t },
                  }))
                }}
                onToggleVisible={() => {
                  setMetricChartOptions(o => ({
                    ...o,
                    [key]: { ...opt, visible: !opt.visible },
                  }))
                }}
                onRemove={() => setMetrics(m => m.filter(k => k !== key))}
              />
            </div>
          )
        })}

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
          padding: '8px 12px',
          borderTop: metrics.length > 0 ? '1px solid var(--border)' : 'none',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: showPct ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            <Toggle on={showPct} onToggle={() => setShowPct(o => !o)} color={PCT_COLOR} />
            % Chg.
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: indexZero ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            <Toggle on={indexZero} onToggle={() => setIndexZero(o => !o)} />
            Index to 0
          </label>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: 3 }}>Scale</span>
            {(['K', 'M', 'B'] as Scale[]).map(s => <TBtn key={s} active={scale === s} onClick={() => setScale(s)}>{s}</TBtn>)}
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: 3 }}>Period</span>
            <TBtn active={period === 'annual'}  onClick={() => setPeriod('annual')}>Annual</TBtn>
            <TBtn active={period === 'quarter'} onClick={() => setPeriod('quarter')}>Quarterly</TBtn>
          </div>

          <div style={{ flex: 1 }} />

          {loading && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Loading…</span>}
        </div>
      </div>

      {/* Timeline slider */}
      {allData.length > 1 && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          padding: '8px 12px 4px',
        }}>
          <TimelineSlider
            min={0}
            max={maxRange}
            value={range}
            onChange={setRange}
            labels={timelineLabels}
          />
        </div>
      )}

      {/* Chart panel */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        padding: '16px 12px 12px',
      }}>
        {company && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {company.symbol}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: 8 }}>{company.name}</span>
          </div>
        )}

        {!company ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 320, gap: 10, color: 'var(--text-muted)', fontSize: '0.82rem',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3">
              <circle cx="11" cy="11" r="8"/><line x1="16" y1="16" x2="22" y2="22"/>
            </svg>
            Search for a company above to get started
          </div>
        ) : chartData.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 320, gap: 10, padding: '0 24px', textAlign: 'center',
            color: dataErr ? 'var(--red)' : 'var(--text-muted)', fontSize: '0.82rem',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            {loading ? (
              'Fetching data…'
            ) : dataErr ? (
              <>
                <span style={{ fontWeight: 600 }}>Could not load data for {company.symbol}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: 540, lineHeight: 1.45 }}>{dataErr}</span>
              </>
            ) : (
              'No data available for this company and period'
            )}
          </div>
        ) : visibleMetricKeys.length === 0 && !showPctOnChart ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 320, gap: 10, color: 'var(--text-muted)', fontSize: '0.82rem',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            All metrics are hidden — use the eye control to show a series, or remove a row to add different metrics.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: needsRightAxis ? 56 : 8, bottom: 0, left: 4 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={false} tickLine={false}
              />
              {visibleMetricKeys.length > 0 && (
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  axisLine={false} tickLine={false} width={48}
                  tickFormatter={v =>
                    leftDef?.format === 'percent' || leftDef?.format === 'ratio'
                      ? String(+v.toFixed(1))
                      : `${+v.toFixed(0)}`
                  }
                />
              )}
              {needsRightAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{
                    fill:
                      visibleMetricKeys.length > 1
                        ? LINE_COLOR
                        : showPctOnChart
                          ? PCT_COLOR
                          : LINE_COLOR,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={v => `${+v.toFixed(1)}`}
                />
              )}
              <Tooltip content={<ChartTooltip scale={scale} metricKeys={metrics} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
              {showPctOnChart && <ReferenceLine yAxisId="right" y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />}

              {metrics.flatMap((key, slotIdx) => {
                const opt = metricChartOptions[key] ?? { chartType: slotIdx === 0 ? 'bar' : 'line', visible: true }
                if (!opt.visible) return []
                const vIdx = visibleMetricKeys.indexOf(key)
                if (vIdx < 0) return []
                const yAxisId = vIdx === 0 ? 'left' : 'right'
                const color = slotIdx === 0 ? ACCENT : LINE_COLOR
                const ct = opt.chartType
                if (ct === 'bar') {
                  return [
                    <Bar
                      key={key}
                      yAxisId={yAxisId}
                      dataKey={key}
                      fill={color}
                      fillOpacity={0.85}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={52}
                    />,
                  ]
                }
                if (ct === 'line') {
                  return [
                    <Line
                      key={key}
                      yAxisId={yAxisId}
                      dataKey={key}
                      stroke={color}
                      strokeWidth={slotIdx === 0 ? 2.5 : 2}
                      dot={{ r: 3, fill: color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />,
                  ]
                }
                return [
                  <Area
                    key={key}
                    yAxisId={yAxisId}
                    dataKey={key}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={false}
                  />,
                ]
              })}

              {showPctOnChart && metrics[0] && (
                <Line
                  yAxisId="right"
                  dataKey={`__pct_${metrics[0]}`}
                  stroke={PCT_COLOR}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3, fill: PCT_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {metrics.length > 0 && company && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            {metrics.map((key, i) => {
              const def = METRICS.find(m => m.key === key)
              const vis = metricChartOptions[key]?.visible !== false
              return def ? (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: vis ? 1 : 0.45,
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: i === 0 ? ACCENT : LINE_COLOR, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{def.label}</strong>
                    {!vis ? ' (hidden)' : ''}
                    {' — '}{def.description}
                  </span>
                </div>
              ) : null
            })}
            {showPctOnChart && metrics[0] && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 3, background: PCT_COLOR, flexShrink: 0, borderRadius: 1 }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <strong style={{ color: PCT_COLOR, fontWeight: 600 }}>% Chg.</strong>
                  {' — '}Year-over-year change in {METRICS.find(m => m.key === metrics[0])?.label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

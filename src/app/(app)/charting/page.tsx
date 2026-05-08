'use client'

import { useState, useEffect, useRef, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react'
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
const ACCENT = 'var(--accent)'
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

function ChartToggle({ on, onToggle, color = ACCENT }: { on: boolean; onToggle: () => void; color?: string }) {
  return (
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

function SingleMetricPicker({ selected, onChange }: { selected: string | null; onChange: (key: string | null) => void }) {
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

  const pick = (key: string) => {
    onChange(selected === key ? null : key)
  }

  const sel = selected ? METRICS.find(x => x.key === selected) : null

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
        {sel ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: ACCENT, color: '#000', borderRadius: 3, padding: '2px 7px',
            fontSize: '0.7rem', fontWeight: 600,
          }}>
            {sel.label}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.55)', lineHeight: 1, padding: 0, fontSize: '0.9rem' }}
            >
              ×
            </button>
          </span>
        ) : (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Select one metric…</span>
        )}
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
                const isSel = selected === m.key
                return (
                  <div key={m.key} onClick={() => pick(m.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px', cursor: 'pointer',
                      background: isSel ? 'var(--bg-active)' : 'transparent',
                      borderLeft: isSel ? `2px solid ${ACCENT}` : '2px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSel ? 'var(--bg-active)' : 'transparent' }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSel ? 600 : 400 }}>{m.label}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{m.description}</div>
                    </div>
                    {isSel && (
                      <span style={{ fontSize: '0.65rem', color: ACCENT, fontWeight: 700, marginLeft: 10 }}>✓</span>
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

function TimelineSliderHandle({
  posPct,
  onMouseDown,
}: {
  posPct: number
  onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: `${posPct}%`,
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
        <TimelineSliderHandle
          posPct={pct(value[0])}
          onMouseDown={(e) => { e.preventDefault(); dragging.current = 'left' }}
        />
        <TimelineSliderHandle
          posPct={pct(value[1])}
          onMouseDown={(e) => { e.preventDefault(); dragging.current = 'right' }}
        />
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

function MetricSeriesIconBtn({
  type,
  title,
  chartType,
  colorActive,
  onSetType,
}: {
  type: ChartType
  title: string
  chartType: ChartType
  colorActive: string
  onSetType: (t: ChartType) => void
}) {
  return (
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
}

function MetricSeriesToolbar({
  chartType,
  visible,
  colorActive,
  onSetType,
  onToggleVisible,
  onRemove,
  showRemove = true,
}: {
  chartType: ChartType
  visible: boolean
  colorActive: string
  onSetType: (t: ChartType) => void
  onToggleVisible: () => void
  onRemove: () => void
  showRemove?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <MetricSeriesIconBtn type="line" title="Line" chartType={chartType} colorActive={colorActive} onSetType={onSetType} />
      <MetricSeriesIconBtn type="bar" title="Bar" chartType={chartType} colorActive={colorActive} onSetType={onSetType} />
      <MetricSeriesIconBtn type="area" title="Area" chartType={chartType} colorActive={colorActive} onSetType={onSetType} />
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
      {showRemove && (
        <button
          type="button"
          title="Remove"
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
      )}
    </div>
  )
}

function ChartTooltip({ active, payload, label, scale }: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string }[]
  label?: string
  scale: Scale
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
  const [metricKey, setMetricKey]  = useState<string | null>('operatingIncome')
  const [period,    setPeriod]    = useState<Period>('annual')
  const [scale,     setScale]     = useState<Scale>('B')
  const [valueSeries, setValueSeries] = useState<MetricChartOptions>({ chartType: 'bar', visible: true })
  const [pctSeries, setPctSeries]   = useState<MetricChartOptions>({ chartType: 'line', visible: true })
  const [indexZero, setIndexZero] = useState(false)
  const [rows,      setRows]      = useState<Record<string, unknown>[]>([])
  const [mRows,     setMRows]     = useState<Record<string, unknown>[]>([])
  const [loading,   setLoading]   = useState(false)
  const [range,     setRange]     = useState<[number, number]>([0, 9])
  const [dataErr,   setDataErr]   = useState<string | null>(null)

  useEffect(() => {
    if (!company) return
    const sym = company.symbol
    const p   = period
    let cancelled = false

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

    void (async () => {
      setLoading(true)
      setDataErr(null)
      try {
        const [fin, met] = await Promise.allSettled([load('fmp/financials'), load('fmp/metrics')])
        if (cancelled) return
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
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [company, period])

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
    const def = metricKey ? METRICS.find(m => m.key === metricKey) : null

    return sliced.map((row, i) => {
      const point: Record<string, unknown> = { date: fmtDate(row.date as string, period) }

      if (metricKey && def) {
        let raw = typeof row[metricKey] === 'number' ? (row[metricKey] as number) : null
        if (raw === null) {
          point[metricKey] = null
        } else {
          if (def.format !== 'percent' && def.format !== 'ratio') {
            raw = raw / SCALE_DIV[scale]
          } else if (def.format === 'percent') {
            raw = raw * 100
          }

          if (indexZero && i > 0) {
            const first = sliced[0][metricKey]
            if (typeof first === 'number' && first !== 0) raw = ((raw - first) / Math.abs(first)) * 100
          }

          point[metricKey] = +raw.toFixed(2)
        }
      }

      if (metricKey && i > 0) {
        const prev = sliced[i - 1][metricKey]
        const curr = sliced[i][metricKey]
        if (typeof prev === 'number' && typeof curr === 'number' && prev !== 0) {
          point[`__pct_${metricKey}`] = +((curr - prev) / Math.abs(prev) * 100).toFixed(2)
        } else {
          point[`__pct_${metricKey}`] = null
        }
      } else if (metricKey) {
        point[`__pct_${metricKey}`] = null
      }

      return point
    })
  }, [sliced, metricKey, scale, period, indexZero])

  const timelineLabels = allData.map(r => fmtDate(r.date as string, period))
  const maxRange       = Math.max(0, allData.length - 1)

  const valueDef = metricKey ? METRICS.find(m => m.key === metricKey) : null

  const valueVisible = Boolean(metricKey && valueSeries.visible)
  const pctVisible   = Boolean(metricKey && pctSeries.visible)

  const dualAxes       = valueVisible && pctVisible
  const needsRightAxis = dualAxes
  const valueYAxisId   = 'left'
  const pctYAxisId     = dualAxes ? 'right' : 'left'

  const emptyChart = !metricKey || (!valueVisible && !pctVisible)

  const valueRowTitle =
    valueDef
      ? `${valueDef.label}${valueDef.format === 'currency' ? ' ($)' : ''}`
      : ''

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 20px 40px' }}>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Charting</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          One metric at a time — level ($ scaled) alongside period-over-period % change.
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
        <SingleMetricPicker selected={metricKey} onChange={setMetricKey} />
      </div>

      {/* Same metric: value ($) + % chg — chart type per series */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
      }}>
        {metricKey && valueDef && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    flexShrink: 0,
                    background: ACCENT,
                    opacity: valueSeries.visible ? 1 : 0.35,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: valueSeries.visible ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    {valueRowTitle}
                  </div>
                  <div style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    marginTop: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {valueDef.description}
                  </div>
                </div>
              </div>
              <MetricSeriesToolbar
                chartType={valueSeries.chartType}
                visible={valueSeries.visible}
                colorActive={ACCENT}
                showRemove={false}
                onSetType={t => setValueSeries(s => ({ ...s, chartType: t }))}
                onToggleVisible={() => setValueSeries(s => ({ ...s, visible: !s.visible }))}
                onRemove={() => {}}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
              }}
            >
              <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    flexShrink: 0,
                    background: PCT_COLOR,
                    opacity: pctSeries.visible ? 1 : 0.35,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: pctSeries.visible ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    {valueDef.label} % Chg.
                  </div>
                  <div style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    marginTop: 1,
                  }}>
                    Period-over-period % change ({period === 'annual' ? 'year over year' : 'quarter over quarter'})
                  </div>
                </div>
              </div>
              <MetricSeriesToolbar
                chartType={pctSeries.chartType}
                visible={pctSeries.visible}
                colorActive={PCT_COLOR}
                showRemove={false}
                onSetType={t => setPctSeries(s => ({ ...s, chartType: t }))}
                onToggleVisible={() => setPctSeries(s => ({ ...s, visible: !s.visible }))}
                onRemove={() => {}}
              />
            </div>
          </>
        )}

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
          padding: '8px 12px',
          borderTop: metricKey ? '1px solid var(--border)' : 'none',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: indexZero ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            <ChartToggle on={indexZero} onToggle={() => setIndexZero(o => !o)} />
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
        ) : !metricKey ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 320, gap: 10, color: 'var(--text-muted)', fontSize: '0.82rem',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            Pick one metric above — the chart compares its level ($ / value) with period-over-period % change.
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
        ) : emptyChart ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 320, gap: 10, color: 'var(--text-muted)', fontSize: '0.82rem',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            Both series are hidden — use the eye control on the value or % row to show one or both.
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
              {(valueVisible || (pctVisible && !dualAxes)) && (
                <YAxis
                  yAxisId="left"
                  tick={{
                    fill: dualAxes ? 'var(--text-muted)' : pctVisible ? PCT_COLOR : 'var(--text-muted)',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={v => {
                    if (pctVisible && !valueVisible)
                      return `${+v.toFixed(1)}`
                    return valueDef?.format === 'percent' || valueDef?.format === 'ratio'
                      ? String(+v.toFixed(1))
                      : `${+v.toFixed(0)}`
                  }}
                />
              )}
              {needsRightAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: PCT_COLOR, fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={v => `${+v.toFixed(1)}`}
                />
              )}
              <Tooltip
                content={<ChartTooltip scale={scale} />}
                cursor={{ fill: 'rgba(255,255,255,0.025)' }}
              />
              {pctVisible && (
                <ReferenceLine yAxisId={pctYAxisId} y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />
              )}

              {metricKey && valueVisible && valueSeries.chartType === 'bar' && (
                <Bar yAxisId={valueYAxisId} dataKey={metricKey} fill={ACCENT} fillOpacity={0.85} radius={[2, 2, 0, 0]} maxBarSize={52} />
              )}
              {metricKey && valueVisible && valueSeries.chartType === 'line' && (
                <Line yAxisId={valueYAxisId} dataKey={metricKey} stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              )}
              {metricKey && valueVisible && valueSeries.chartType === 'area' && (
                <Area yAxisId={valueYAxisId} dataKey={metricKey} stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={2} dot={false} />
              )}

              {metricKey && pctVisible && pctSeries.chartType === 'bar' && (
                <Bar
                  yAxisId={pctYAxisId}
                  dataKey={`__pct_${metricKey}`}
                  fill={PCT_COLOR}
                  fillOpacity={0.85}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={52}
                />
              )}
              {metricKey && pctVisible && pctSeries.chartType === 'line' && (
                <Line
                  yAxisId={pctYAxisId}
                  dataKey={`__pct_${metricKey}`}
                  stroke={PCT_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PCT_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {metricKey && pctVisible && pctSeries.chartType === 'area' && (
                <Area
                  yAxisId={pctYAxisId}
                  dataKey={`__pct_${metricKey}`}
                  stroke={PCT_COLOR}
                  fill={PCT_COLOR}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {company && metricKey && valueDef && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: valueSeries.visible ? 1 : 0.45 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: ACCENT, flexShrink: 0 }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{valueRowTitle}</strong>
                {!valueSeries.visible ? ' (hidden)' : ''}
                {' — '}{valueDef.description}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: pctSeries.visible ? 1 : 0.45 }}>
              <span style={{ width: 10, height: 3, background: PCT_COLOR, flexShrink: 0, borderRadius: 1 }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: PCT_COLOR, fontWeight: 600 }}>{valueDef.label} % Chg.</strong>
                {!pctSeries.visible ? ' (hidden)' : ''}
                {' — '}
                {period === 'annual' ? 'Year-over-year' : 'Quarter-over-quarter'} vs prior period
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

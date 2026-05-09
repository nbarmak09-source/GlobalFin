'use client'

import { useEffect, useMemo, useState } from 'react'
import { getUsMarketSession, type UsMarketSessionInfo } from '@/lib/usMarketSession'

/** Stable SSR + first paint so countdown never differs between server HTML and hydration. */
const PLACEHOLDER: UsMarketSessionInfo = {
  status: 'closed',
  dot: 'muted',
  headline: 'US markets',
  subline: 'Loading hours…',
  ariaLabel:
    'US stock market schedule. Updating time until next session.',
  tooltip:
    'NYSE/Nasdaq regular hours 9:30 AM – 4:00 PM ET (weekdays; federal holidays & Good Friday).',
}

const DOT: Record<'green' | 'amber' | 'muted', string> = {
  green: '#3fb950',
  amber: '#d4a024',
  muted: 'rgba(255,255,255,0.35)',
}

export function MarketSessionBadge({
  className = '',
}: {
  className?: string
}) {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [mounted])

  const s = useMemo(() => {
    if (!mounted) return PLACEHOLDER
    return getUsMarketSession(Date.now())
  }, [mounted, tick])

  return (
    <span
      className={`flex items-center gap-2 ${className}`}
      title={s.tooltip}
      role="status"
      aria-live="polite"
      aria-label={s.ariaLabel}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: DOT[s.dot],
          boxShadow:
            s.dot === 'green'
              ? '0 0 6px #3fb950'
              : s.dot === 'amber'
                ? '0 0 6px rgba(212,160,36,0.6)'
                : 'none',
        }}
        aria-hidden="true"
      />
      <span
        className="flex flex-col leading-tight min-w-0"
        style={{
          color: 'var(--color-muted)',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.02em',
        }}
      >
        <span className="font-medium text-foreground/90">{s.headline}</span>
        <span className="opacity-85 truncate max-w-[11rem]">{s.subline}</span>
      </span>
    </span>
  )
}

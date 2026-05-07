'use client'

import { useRouter } from 'next/navigation'
import SymbolSearch from '@/components/SymbolSearch'
import TickerTape from '@/components/TickerTape'

export function TopBar() {
  const router = useRouter()

  return (
    <header
      className="fixed top-0 right-0 z-20 flex flex-col left-0 md:left-[88px]"
      style={{
        background: 'var(--bg-surface)',
      }}
    >
      {/* Row 1 — search + live (desktop only) */}
      <div
        className="hidden md:flex items-center gap-3 px-4 border-b"
        style={{ height: 52, borderColor: 'var(--border)' }}
      >
        <div className="relative flex-1 max-w-3xl">
          <SymbolSearch
            variant="topbar"
            placeholder="Search tickers, companies…"
            onSelect={(symbol) => {
              router.push(`/stocks?symbol=${encodeURIComponent(symbol)}`)
            }}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span
            className="hidden lg:flex items-center gap-1.5"
            style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}
          >
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', boxShadow: '0 0 5px var(--green)',
            }} aria-hidden="true" />
            Live
          </span>
        </div>
      </div>

      {/* Row 2 — ticker (all breakpoints; single instance) */}
      <div>
        <TickerTape />
      </div>
    </header>
  )
}

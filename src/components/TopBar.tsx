'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SymbolSearch from '@/components/SymbolSearch'
import TickerTape from '@/components/TickerTape'
import { GlobalFinBrand } from '@/components/Logo'

export function TopBar() {
  const router = useRouter()

  return (
    <header
      className="fixed top-0 right-0 z-20 flex flex-col left-0 md:left-[88px]"
      style={{
        background: 'rgba(11,11,15,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Search row — desktop only */}
      <div
        className="hidden md:flex items-center gap-3 px-4"
        style={{
          height: 60,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand lockup — short height for density; tap-friendly link */}
        <Link
          href="/"
          className="mr-2 shrink-0 select-none rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          aria-label="GLOBALFIN Capital Markets — Home"
        >
          <GlobalFinBrand variant="topbar" />
        </Link>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <SymbolSearch
            variant="topbar"
            placeholder="Search tickers, companies…"
            onSelect={(symbol) => {
              router.push(`/stocks?symbol=${encodeURIComponent(symbol)}`)
            }}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Live indicator */}
          <span
            className="hidden lg:flex items-center gap-1.5"
            style={{
              color: 'var(--color-muted)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.02em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#3fb950',
                boxShadow: '0 0 6px #3fb950',
              }}
              aria-hidden="true"
            />
            Live
          </span>

          {/* Notification bell */}
          <button
            type="button"
            className="btn-icon"
            aria-label="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M10 2a6 6 0 0 0-6 6c0 2.5-.8 4.5-2 6h16c-1.2-1.5-2-3.5-2-6a6 6 0 0 0-6-6Z"/>
              <path d="M10 18a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2Z"/>
            </svg>
          </button>

          {/* User avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(201,162,39,0.15)',
              border: '1px solid rgba(201,162,39,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="User menu"
          >
            GF
          </div>
        </div>
      </div>

      {/* Ticker tape — all breakpoints */}
      <div>
        <TickerTape />
      </div>
    </header>
  )
}

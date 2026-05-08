'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'

const SIDEBAR_W = 88

// ── Nav structure with sub-items ───────────────────────────────────────────
// Add, remove, or rename sub-items to match your actual routes.
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="2" width="7" height="7" rx="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    // No sub-items — clicking navigates directly
    children: [],
  },
  {
    label: 'Charting',
    href: '/charting',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="11" width="4" height="7" rx="1"/>
        <rect x="8" y="7"  width="4" height="11" rx="1"/>
        <rect x="14" y="3" width="4" height="15" rx="1"/>
        <line x1="2" y1="19" x2="18" y2="19"/>
      </svg>
    ),
    children: [],
  },
  {
    label: 'Macro',
    href: '/macro',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 14l4-5 4 3 4-6 4 3"/><line x1="2" y1="17" x2="18" y2="17"/>
      </svg>
    ),
    children: [
      { label: 'Overview',          href: '/macro',                  icon: '◎' },
      { label: 'Interest Rates',    href: '/macro/interest-rates',   icon: '≋' },
      { label: 'Inflation',         href: '/macro/inflation',        icon: '△' },
      { label: 'GDP & Growth',      href: '/macro/gdp',              icon: '▦' },
      { label: 'Employment',        href: '/macro/employment',       icon: '⊞' },
      { label: 'Currency',          href: '/macro/currency',         icon: '◈' },
      { label: 'Commodities',       href: '/macro/commodities',      icon: '⬡' },
    ],
  },
  {
    label: 'Equities',
    href: '/equities',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <polyline points="2,16 7,9 11,13 15,6 18,8"/><line x1="2" y1="19" x2="18" y2="19"/>
      </svg>
    ),
    children: [
      { label: 'Market Overview',   href: '/equities',               icon: '◎' },
      { label: 'Indices',           href: '/equities/indices',       icon: '▦' },
      { label: 'Sector Performance',href: '/equities/sectors',       icon: '⊞' },
      { label: 'Deal Flow',         href: '/equities/deal-flow',     icon: '⤢' },
      { label: 'Earnings',          href: '/equities/earnings',      icon: '◈' },
      { label: 'News',              href: '/equities/news',          icon: '≋' },
    ],
  },
  {
    label: 'Fixed Income',
    href: '/fixed-income',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <line x1="4" y1="5" x2="16" y2="5"/><line x1="4" y1="9" x2="16" y2="9"/>
        <line x1="4" y1="13" x2="12" y2="13"/><line x1="4" y1="17" x2="9" y2="17"/>
      </svg>
    ),
    children: [
      { label: 'Overview',          href: '/fixed-income',           icon: '◎' },
      { label: 'Yield Curve',       href: '/fixed-income/yield-curve', icon: '≋' },
      { label: 'Government Bonds',  href: '/fixed-income/government', icon: '▦' },
      { label: 'Corporate Bonds',   href: '/fixed-income/corporate', icon: '△' },
      { label: 'Credit Spreads',    href: '/fixed-income/spreads',   icon: '◈' },
    ],
  },
  {
    label: 'Alternatives',
    href: '/alternatives',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="10" r="7"/>
        <line x1="10" y1="3" x2="10" y2="17"/>
        <path d="M6.5 6.5 Q10 10 13.5 6.5"/><path d="M6.5 13.5 Q10 10 13.5 13.5"/>
      </svg>
    ),
    children: [
      { label: 'Overview',          href: '/alternatives',           icon: '◎' },
      { label: 'Private Equity',    href: '/alternatives/private-equity', icon: '▦' },
      { label: 'Real Estate',       href: '/alternatives/real-estate', icon: '⊞' },
      { label: 'Crypto',            href: '/alternatives/crypto',    icon: '◈' },
      { label: 'Commodities',       href: '/alternatives/commodities', icon: '⬡' },
    ],
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="6" width="14" height="11" rx="1.5"/>
        <path d="M7 6V5a3 3 0 016 0v1"/>
        <line x1="10" y1="10" x2="10" y2="13"/><line x1="8" y1="11.5" x2="12" y2="11.5"/>
      </svg>
    ),
    children: [
      { label: 'Holdings',          href: '/portfolio',              icon: '◎' },
      { label: 'Performance',       href: '/portfolio/performance',  icon: '△' },
      { label: 'Allocation',        href: '/portfolio/allocation',   icon: '◈' },
      { label: 'Risk',              href: '/portfolio/risk',         icon: '≋' },
    ],
  },
  {
    label: 'Supply Chain',
    href: '/supply-chain',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="4"  cy="10" r="2"/><circle cx="10" cy="4"  r="2"/>
        <circle cx="16" cy="10" r="2"/><circle cx="10" cy="16" r="2"/>
        <line x1="6"  y1="10" x2="8"  y2="10"/><line x1="12" y1="10" x2="14" y2="10"/>
        <line x1="10" y1="6"  x2="10" y2="8"/><line x1="10" y1="12" x2="10" y2="14"/>
      </svg>
    ),
    children: [
      { label: 'Overview',          href: '/supply-chain',           icon: '◎' },
      { label: 'Suppliers',         href: '/supply-chain/suppliers', icon: '⤢' },
      { label: 'Disruptions',       href: '/supply-chain/disruptions', icon: '△' },
      { label: 'Trade Flows',       href: '/supply-chain/trade',     icon: '≋' },
    ],
  },
]

const NAV_BOTTOM = [
  {
    label: 'Settings',
    href: '/account',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="10" r="2.5"/>
        <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.2 4.2l1 1M14.8 14.8l1 1M4.2 15.8l1-1M14.8 5.2l1-1"/>
      </svg>
    ),
    children: [],
  },
]

// ── Component ──────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()
  const [activeHover, setActiveHover] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState<number>(0)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Delay closing so cursor can move from nav item to flyout without it closing
  const handleMouseEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveHover(label)
  }
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setActiveHover(null), 100)
  }

  const NavItem = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    const isHovered = activeHover === item.label
    const hasChildren = item.children.length > 0
    const itemRef = useRef<HTMLDivElement>(null)

    const onEnter = () => {
      if (itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect()
        setFlyoutTop(rect.top)
      }
      handleMouseEnter(item.label)
    }

    return (
      <div
        ref={itemRef}
        className="relative"
        onMouseEnter={onEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Nav item button / link */}
        <Link
          href={item.href}
          className="flex flex-col items-center justify-center gap-1 rounded-md mx-2 transition-colors duration-100"
          style={{
            padding: '8px 6px',
            color: active || isHovered ? 'var(--text-primary)' : '#8b949e',
            background: active ? 'var(--bg-active)' : isHovered ? 'var(--bg-hover)' : 'transparent',
            position: 'relative',
          }}
        >
          {/* Yellow active bar */}
          <span
            style={{
              position: 'absolute',
              left: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 24,
              borderRadius: '0 2px 2px 0',
              background: active ? 'var(--accent)' : 'transparent',
              transition: 'background 120ms',
            }}
            aria-hidden="true"
          />
          <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
          <span style={{
            fontSize: '0.6rem',
            fontWeight: active ? 600 : 400,
            letterSpacing: '0.03em',
            lineHeight: 1,
            userSelect: 'none',
          }}>
            {item.label}
          </span>
        </Link>

        {/* Flyout panel — only renders if item has children and is hovered */}
        {hasChildren && isHovered && (
          <div
            onMouseEnter={() => handleMouseEnter(item.label)}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              left: SIDEBAR_W,
              top: flyoutTop,
              zIndex: 50,
              minWidth: 220,
              maxHeight: `calc(100dvh - ${flyoutTop}px - 16px)`,
              overflowY: 'auto',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '6px 0',
              animation: 'flyout-in 120ms ease-out forwards',
            }}
          >
            {/* Section label at top of flyout */}
            <div style={{
              padding: '6px 14px 8px',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 4,
            }}>
              {item.label}
            </div>

            {/* Sub-items */}
            {item.children.map((child) => {
              const childActive = pathname === child.href
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className="flex items-center gap-3 transition-colors duration-75"
                  style={{
                    padding: '7px 14px',
                    fontSize: '0.8125rem',
                    fontWeight: childActive ? 600 : 400,
                    color: childActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: childActive ? 'var(--bg-active)' : 'transparent',
                    borderLeft: childActive ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!childActive) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!childActive) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                    }
                  }}
                  onClick={() => setActiveHover(null)}
                >
                  <span style={{ fontSize: '0.75rem', opacity: 0.6, width: 14, textAlign: 'center' }}>
                    {child.icon}
                  </span>
                  {child.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Flyout entrance animation */}
      <style>{`
        @keyframes flyout-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30"
        style={{
          width: SIDEBAR_W,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
        }}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{ height: 72, borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-center rounded-lg font-bold"
            style={{
              width: 36, height: 36,
              background: 'var(--accent)',
              color: '#000',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}
          >
            CM
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex flex-col flex-1 pt-2 overflow-y-auto" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>

        {/* Bottom nav */}
        <div style={{ borderTop: '1px solid var(--border)', paddingBottom: 8 }}>
          {NAV_BOTTOM.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </aside>
    </>
  )
}

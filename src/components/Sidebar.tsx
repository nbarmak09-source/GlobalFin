'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useState, useRef, type ReactNode } from 'react'
import { GlobalFinBrand } from '@/components/Logo'

/** Stable empty search params for nav fallback (desktop collapsed state). */
const EMPTY_SEARCH_PARAMS = new URLSearchParams()

const SIDEBAR_W = 88

/** Maps git commit count (e.g. 63) to sidebar label `v6.3`. Override env can be digits or `major.minor`. */
function sidebarReleaseDisplay(raw: string | undefined): string {
  if (raw == null || raw === "") return "v—"
  const trimmed = raw.trim()
  if (trimmed === "dev") return "v-dev"
  if (/^[0-9]+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10)
    return `v${Math.floor(n / 10)}.${n % 10}`
  }
  if (/^\d+\.\d+$/.test(trimmed)) return `v${trimmed}`
  return `v${trimmed}`
}

/** Match flyout row active state; path + query must match when the child href includes search params. */
function isSidebarChildActive(
  childHref: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  let url: URL
  try {
    url = new URL(childHref, 'http://localhost')
  } catch {
    return pathname === childHref
  }

  if (pathname !== url.pathname) return false

  if (pathname === "/portfolio" && url.pathname === "/portfolio") {
    const childTab = url.searchParams.get("tab")
    const pageTab = searchParams.get("tab")
    if (childTab === "watchlist") return pageTab === "watchlist"
    if (!url.searchParams.has("tab")) {
      return pageTab !== "watchlist"
    }
  }

  const queryKeys = [...url.searchParams.keys()]
  if (queryKeys.length === 0) {
    return true
  }

  for (const key of queryKeys) {
    const expected = url.searchParams.get(key)
    const actual = searchParams.get(key)
    if (key === 'tab' && pathname === '/analysis') {
      const exp = (expected ?? '').toLowerCase()
      const actRaw = (actual ?? '').trim().toLowerCase()
      const act = exp === 'overview' && actRaw === '' ? 'overview' : actRaw
      if (act !== exp) return false
      continue
    }
    if (actual !== expected) return false
  }
  return true
}

type NavFlyoutChild = { label: string; href: string; icon: string }

type NavEntry = {
  label: string
  href: string
  icon: ReactNode
  children: NavFlyoutChild[]
  /** Extra path prefixes where this nav group should show as selected (e.g. /pitch under Tools). */
  extraActivePrefixes?: string[]
}

const NAV_ITEMS: NavEntry[] = [
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
    children: [],
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
      { label: 'Holdings',     href: '/portfolio',                 icon: '◎' },
      { label: 'Watchlist',    href: '/portfolio?tab=watchlist',   icon: '☆' },
      { label: 'Performance',  href: '/portfolio/performance',   icon: '△' },
      { label: 'Allocation',   href: '/portfolio/allocation',    icon: '◈' },
      { label: 'Risk',         href: '/portfolio/risk',          icon: '≋' },
    ],
  },
  {
    label: 'Analysis',
    href: '/analysis',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <line x1="16.5" y1="16.5" x2="22" y2="22"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
    children: [
      { label: 'Overview',         href: '/analysis?tab=overview',    icon: '◎' },
      { label: 'Bulls & Bears',    href: '/analysis?tab=bulls-bears', icon: '⚖' },
      { label: 'Valuation',        href: '/analysis?tab=valuation',   icon: '▦' },
      { label: 'Financials',       href: '/analysis?tab=financials',  icon: '≋' },
      { label: 'Forecast',         href: '/analysis?tab=forecast',    icon: '△' },
      { label: 'Compare',          href: '/analysis?tab=compare',     icon: '⤢' },
      { label: 'Historical Price', href: '/analysis?tab=historical',  icon: '◈' },
      { label: 'Solvency',         href: '/analysis?tab=solvency',    icon: '⊞' },
      { label: 'SEC Filings',      href: '/analysis?tab=sec-filings', icon: '⬡' },
    ],
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
      { label: 'Market Overview',    href: '/equities',               icon: '◎' },
      { label: 'Indices',            href: '/equities/indices',       icon: '▦' },
      { label: 'Sector Performance', href: '/equities/sectors',       icon: '⊞' },
      { label: 'Deal Flow',          href: '/equities/deal-flow',     icon: '⤢' },
      { label: 'Earnings Calendar',  href: '/equities/earnings',      icon: '◈' },
      { label: 'News',               href: '/equities/news',          icon: '≋' },
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
      { label: 'Overview',          href: '/fixed-income',             icon: '◎' },
      { label: 'Yield Curve',       href: '/fixed-income/yield-curve', icon: '≋' },
      { label: 'Government Bonds',  href: '/fixed-income/government',  icon: '▦' },
      { label: 'Corporate Bonds',   href: '/fixed-income/corporate',   icon: '△' },
      { label: 'Credit Spreads',    href: '/fixed-income/spreads',     icon: '◈' },
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
      { label: 'Overview',          href: '/alternatives',                  icon: '◎' },
      { label: 'Private Equity',    href: '/alternatives/private-equity',   icon: '▦' },
      { label: 'Real Estate',       href: '/alternatives/real-estate',      icon: '⊞' },
      { label: 'Crypto',            href: '/alternatives/crypto',           icon: '◈' },
      { label: 'Commodities',       href: '/alternatives/commodities',      icon: '⬡' },
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
      { label: 'Overview',     href: '/supply-chain',               icon: '◎' },
      { label: 'Suppliers',    href: '/supply-chain/suppliers',     icon: '⤢' },
      { label: 'Disruptions',  href: '/supply-chain/disruptions',   icon: '△' },
      { label: 'Trade Flows',  href: '/supply-chain/trade',         icon: '≋' },
    ],
  },
  {
    label: 'Research',
    href: '/research',
    extraActivePrefixes: ['/research'],
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 2h9l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
        <polyline points="13 2 13 6 17 6"/>
        <line x1="7" y1="9" x2="13" y2="9"/>
        <line x1="7" y1="12" x2="13" y2="12"/>
        <line x1="7" y1="15" x2="10" y2="15"/>
      </svg>
    ),
    children: [
      { label: 'Discover',         href: '/research',                        icon: '◎' },
      { label: 'Fund Letters',     href: '/research/fund-letters',           icon: '◎' },
      { label: 'Super Investors',  href: '/research/super-investors',        icon: '⊞' },
    ],
  },
  {
    label: 'Tools',
    href: '/models',
    extraActivePrefixes: ['/pitch', '/filings'],
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <line x1="7" y1="3" x2="7" y2="17" />
        <line x1="13" y1="3" x2="13" y2="17" />
        <line x1="3" y1="8" x2="17" y2="8" />
        <line x1="3" y1="13" x2="17" y2="13" />
      </svg>
    ),
    children: [
      { label: 'Overview',              href: '/models',      icon: '◎' },
      { label: 'DCF',                   href: '/models/dcf',  icon: '△' },
      { label: 'Comps / Multiples',     href: '/models/comps', icon: '▦' },
      { label: 'LBO',                   href: '/models/lbo',   icon: '⊞' },
      { label: 'Pitch builder',        href: '/pitch',       icon: '✦' },
      { label: 'SEC filing summaries', href: '/filings',    icon: '▤' },
    ],
  },
]

const NAV_BOTTOM: NavEntry[] = [
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

function SidebarNavPanel({
  items,
  searchParams,
}: {
  items: NavEntry[]
  searchParams: URLSearchParams
}) {
  const pathname = usePathname()
  const [activeHover, setActiveHover] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState<number>(0)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveHover(label)
  }
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setActiveHover(null), 100)
  }

  const NavItem = ({ item }: { item: NavEntry }) => {
    const extra =
      item.extraActivePrefixes?.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ) ?? false
    const active =
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`) ||
      extra
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
        <Link
          href={item.href}
          className="flex flex-col items-center justify-center gap-1 rounded-md mx-2 transition-all duration-150"
          style={{
            padding: '8px 6px',
            color: active ? 'var(--color-primary)' : isHovered ? 'var(--color-text)' : 'var(--color-muted)',
            background: active
              ? 'rgba(201,162,39,0.08)'
              : isHovered
              ? 'rgba(255,255,255,0.04)'
              : 'transparent',
            position: 'relative',
            borderLeft: active ? '2px solid var(--color-primary)' : '2px solid transparent',
            borderRadius: active ? '0 6px 6px 0' : undefined,
            marginLeft: 0,
            paddingLeft: active ? 10 : 6,
          }}
        >
          <span style={{ opacity: active ? 1 : isHovered ? 0.9 : 0.6 }}>{item.icon}</span>
          <span style={{
            fontSize: '0.6rem',
            fontWeight: active ? 600 : 400,
            letterSpacing: '0.03em',
            lineHeight: 1,
            userSelect: 'none',
            fontFamily: 'var(--font-body)',
          }}>
            {item.label}
          </span>
        </Link>

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
              background: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border-gold)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-gold)',
              padding: '6px 0',
              animation: 'flyout-in 120ms ease-out forwards',
            }}
          >
            <div style={{
              padding: '6px 14px 8px',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-muted)',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 4,
              fontFamily: 'var(--font-heading)',
            }}>
              {item.label}
            </div>

            {item.children.map((child) => {
              const childActive = isSidebarChildActive(child.href, pathname, searchParams)
              return (
                <Link
                  key={`${child.label}-${child.href}`}
                  href={child.href}
                  className="flex items-center gap-3 transition-colors duration-75"
                  style={{
                    padding: '7px 14px',
                    fontSize: '0.8125rem',
                    fontWeight: childActive ? 600 : 400,
                    color: childActive ? 'var(--color-primary)' : 'var(--color-muted)',
                    background: childActive ? 'rgba(201,162,39,0.08)' : 'transparent',
                    borderLeft: childActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!childActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!childActive) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
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
      {items.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </>
  )
}

function SidebarMainNavSuspended() {
  const searchParams = useSearchParams()
  return (
    <nav className="flex flex-col flex-1 pt-2 overflow-y-auto" aria-label="Primary">
      <SidebarNavPanel items={NAV_ITEMS} searchParams={searchParams} />
    </nav>
  )
}

export function Sidebar() {
  return (
    <>
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
          background: 'var(--color-bg)',
          borderRight: '1px solid var(--color-border)',
        }}
        aria-label="Main navigation"
      >
        {/* Logo — vector mark + wordmark (no raster lockup) */}
        <div
          className="flex flex-col items-center justify-center shrink-0 px-1 py-2.5"
          style={{
            borderBottom: '1px solid rgba(201,162,39,0.2)',
          }}
        >
          <Link
            href="/"
            className="flex flex-col items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-label="GLOBALFIN Capital Markets — Home"
          >
            <GlobalFinBrand variant="sidebar" />
          </Link>
        </div>

        {/* Main nav — Suspense for useSearchParams (Tools → model tabs) */}
        <Suspense
          fallback={
            <nav className="flex flex-col flex-1 pt-2 overflow-y-auto" aria-label="Primary">
              <SidebarNavPanel items={NAV_ITEMS} searchParams={EMPTY_SEARCH_PARAMS} />
            </nav>
          }
        >
          <SidebarMainNavSuspended />
        </Suspense>

        {/* Bottom: settings + version badge */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingBottom: 8 }}>
          <nav className="flex flex-col" aria-label="Account">
            <SidebarNavPanel items={NAV_BOTTOM} searchParams={EMPTY_SEARCH_PARAMS} />
          </nav>
          <div className="flex justify-center pb-1 pt-0.5">
            <span
              title={
                process.env.NEXT_PUBLIC_RELEASE_SHA
                  ? `Build ${process.env.NEXT_PUBLIC_RELEASE_BUILD ?? ""} · ${process.env.NEXT_PUBLIC_RELEASE_SHA}`
                  : `Build ${process.env.NEXT_PUBLIC_RELEASE_BUILD ?? ""}`
              }
              style={{
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'var(--color-primary)',
                background: 'rgba(201,162,39,0.1)',
                borderRadius: '4px',
                padding: '2px 7px',
                fontFamily: 'var(--font-heading)',
              }}
            >
              {sidebarReleaseDisplay(process.env.NEXT_PUBLIC_RELEASE_BUILD)}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useState, useRef } from 'react'
import { GlobalFinBrand } from '@/components/Logo'
import {
  NAV_BOTTOM,
  NAV_ITEMS,
  type NavEntry,
  isSidebarChildActive,
} from '@/lib/nav-config'

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
            aria-label="GlobalFin — Home"
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

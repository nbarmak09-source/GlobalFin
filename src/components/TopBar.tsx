'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Bell, LogOut, User, X } from 'lucide-react'
import type { AlertRecord } from '@/lib/alerts'
import SymbolSearch from '@/components/SymbolSearch'
import TickerTape from '@/components/TickerTape'
import { GlobalFinBrand } from '@/components/Logo'
import { MarketSessionBadge } from '@/components/MarketSessionBadge'

type AlertWithPrice = AlertRecord & { currentPrice?: number | null }

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const sec = Math.floor((Date.now() - then) / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

function directionLabel(direction: string, targetPrice: number): string {
  const t = formatUsd(targetPrice)
  if (direction === 'below') return `below ${t}`
  return `above ${t}`
}

function userInitials(user: {
  name?: string | null
  email?: string | null
} | undefined): string {
  if (!user) return '?'
  const name = user.name?.trim()
  const email = user.email?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    const local = email.split('@')[0] ?? email
    return local.slice(0, 2).toUpperCase()
  }
  return '?'
}

export function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const [alerts, setAlerts] = useState<AlertWithPrice[]>([])
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const loginHref =
    `/login?callbackUrl=${encodeURIComponent(pathname || '/')}`

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        await fetch('/api/alerts/check', { method: 'POST' })
        const res = await fetch('/api/alerts')
        if (!res.ok || cancelled) return
        const data: unknown = await res.json()
        if (!Array.isArray(data)) {
          if (!cancelled) setAlerts([])
          return
        }
        if (!cancelled) setAlerts(data as AlertWithPrice[])
      } catch {
        if (!cancelled) setAlerts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  const unreadCount = useMemo(
    () =>
      alerts.filter((a) => a.triggered && !dismissedIds.has(a.id)).length,
    [alerts, dismissedIds],
  )

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target instanceof Node ? e.target : null
      if (!target) return

      if (
        menuRef.current &&
        menuOpen &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false)
      }
      if (
        notifRef.current &&
        notifOpen &&
        !notifRef.current.contains(target)
      ) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [menuOpen, notifOpen])

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
        <Link
          href="/"
          className="mr-2 shrink-0 select-none rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          aria-label="GLOBALFIN Capital Markets — Home"
        >
          <GlobalFinBrand variant="topbar" />
        </Link>

        <div className="relative flex-1 max-w-xs">
          <SymbolSearch
            variant="topbar"
            placeholder="Search tickers, companies…"
            onSelect={(symbol) => {
              router.push(`/analysis?symbol=${encodeURIComponent(symbol)}`)
            }}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <MarketSessionBadge className="hidden lg:flex" />

          <div className="relative shrink-0" ref={notifRef}>
            <button
              type="button"
              className="btn-icon relative"
              aria-label="Notifications"
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden
              >
                <path d="M10 2a6 6 0 0 0-6 6c0 2.5-.8 4.5-2 6h16c-1.2-1.5-2-3.5-2-6a6 6 0 0 0-6-6Z" />
                <path d="M10 18a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2Z" />
              </svg>
              {unreadCount > 0 &&
                (unreadCount >= 10 ? (
                  <span
                    className="absolute top-0.5 right-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-background"
                    aria-hidden
                  >
                    {unreadCount}
                  </span>
                ) : (
                  <span
                    className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-accent"
                    aria-hidden
                  />
                ))}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] max-h-[min(24rem,80dvh)] overflow-y-auto rounded-xl border border-border bg-card shadow-xl shadow-black/40"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between px-4 pb-2 pt-3">
                  <span className="text-[11px] uppercase tracking-wider text-muted">
                    Notifications
                  </span>
                  <Link
                    href="/alerts"
                    className="text-[11px] text-accent hover:underline"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all
                  </Link>
                </div>

                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Bell
                      className="h-8 w-8 text-muted opacity-20"
                      strokeWidth={1.25}
                      aria-hidden
                    />
                    <p className="text-[12px] text-muted">No alerts set</p>
                  </div>
                ) : (
                  <ul className="border-t border-border/50">
                    {alerts.map((a) => {
                      const dismissed = dismissedIds.has(a.id)
                      const dir = directionLabel(a.direction, a.targetPrice)
                      return (
                        <li
                          key={a.id}
                          className="flex items-start gap-3 border-b border-border/50 px-4 py-2.5 last:border-0"
                        >
                          <span className="mt-1.5 shrink-0" aria-hidden>
                            {!a.triggered ? (
                              <span className="block h-2 w-2 animate-pulse rounded-full bg-green-500" />
                            ) : dismissed ? (
                              <span className="block h-2 w-2 rounded-full bg-muted" />
                            ) : (
                              <span className="block h-2 w-2 rounded-full bg-accent" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                              <span className="text-[12px] font-semibold text-foreground">
                                {a.symbol}
                              </span>
                              <span className="text-[11px] text-muted">
                                {dir}
                              </span>
                            </div>
                            {a.triggered ? (
                              <p className="mt-0.5 text-[11px]">
                                <span className="text-accent">Triggered</span>
                                {a.triggeredAt ? (
                                  <span className="text-muted">
                                    {' '}
                                    {formatRelativeTime(a.triggeredAt)}
                                  </span>
                                ) : null}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-muted">
                                {a.currentPrice != null
                                  ? `Now ${formatUsd(a.currentPrice)} → target ${formatUsd(a.targetPrice)}`
                                  : `Target ${formatUsd(a.targetPrice)}`}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 rounded p-0.5 text-muted transition-colors hover:text-foreground"
                            aria-label={`Dismiss notification for ${a.symbol}`}
                            onClick={() => {
                              setDismissedIds((prev) => new Set([...prev, a.id]))
                            }}
                          >
                            <X className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Auth: Sign in or account menu + sign out */}
          <div className="relative shrink-0" ref={menuRef}>
            {status === 'loading' && (
              <div
                className="rounded-full animate-pulse"
                style={{
                  width: 36,
                  height: 36,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--color-border)',
                }}
                aria-hidden
              />
            )}

            {status === 'unauthenticated' && (
              <Link
                href={loginHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors hover:bg-[rgba(201,162,39,0.08)] min-h-9"
                style={{
                  borderColor: 'var(--color-border-gold)',
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <User className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Sign in
              </Link>
            )}

            {status === 'authenticated' && session?.user && (
              <>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  title={session.user.email ?? 'Account'}
                >
                  <span
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
                  >
                    {userInitials(session.user)}
                  </span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card py-1 shadow-2xl shadow-black/40 z-50"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="px-3 py-2 border-b border-border truncate text-xs text-muted">
                      {session.user.name ?? session.user.email}
                    </div>
                    <Link
                      href="/account"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-card-hover transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="h-4 w-4 shrink-0 text-muted" />
                      Account
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left text-foreground hover:bg-card-hover transition-colors cursor-pointer"
                      onClick={() => {
                        setMenuOpen(false)
                        signOut({ callbackUrl: '/login' })
                      }}
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-muted" />
                      Sign out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div>
        <TickerTape />
      </div>
    </header>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { User, LogOut } from 'lucide-react'
import SymbolSearch from '@/components/SymbolSearch'
import TickerTape from '@/components/TickerTape'
import { GlobalFinBrand } from '@/components/Logo'

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

  const loginHref =
    `/login?callbackUrl=${encodeURIComponent(pathname || '/')}`

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const el = menuRef.current
      if (!el || !menuOpen) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [menuOpen])

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
              router.push(`/stocks?symbol=${encodeURIComponent(symbol)}`)
            }}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
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

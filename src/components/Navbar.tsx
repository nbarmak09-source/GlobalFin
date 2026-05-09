"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTour } from "@/lib/useTour";
import { Logo } from "@/components/Logo";
import SymbolSearch from "@/components/SymbolSearch";
import { useMobileNav } from "@/components/MobileNavProvider";
import {
  NAV_ITEMS,
  getNavSearchSections,
  isNavEntryActive,
  isSidebarChildActive,
} from "@/lib/nav-config";
import { Search, LogOut, User, X, Wand2 } from "lucide-react";

function filterSections(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getNavSearchSections()
    .filter((s) => {
      const hay = `${s.label} ${s.keywords}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 6);
}

function userInitials(user: { name?: string | null; email?: string | null } | undefined): string {
  if (!user) return "?";
  const name = user.name?.trim();
  const email = user.email?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    const local = email.split("@")[0] ?? email;
    return local.slice(0, 2).toUpperCase();
  }
  return "?";
}

function MobileDrawerNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const searchParams = useSearchParams();
  return (
    <>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
        Menu
      </p>
      {NAV_ITEMS.map((entry) => {
        const parentActive = isNavEntryActive(pathname, searchParams, entry);
        return (
          <div key={entry.href} className="mb-3">
            <Link
              href={entry.href}
              onClick={onNavigate}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-[500] transition-colors cursor-pointer ${
                parentActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-card-hover hover:text-foreground"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-current [&_svg]:h-4 [&_svg]:w-4">
                {entry.icon}
              </span>
              {entry.label}
            </Link>
            {entry.children.length > 0 && (
              <div className="mt-1 flex flex-col gap-0.5 border-l border-border/60 ml-4 pl-3">
                {entry.children.map((child) => {
                  const active = isSidebarChildActive(child.href, pathname, searchParams);
                  return (
                    <Link
                      key={`${child.label}-${child.href}`}
                      href={child.href}
                      onClick={onNavigate}
                      className={`flex min-h-[40px] items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-[500] transition-colors cursor-pointer ${
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-muted hover:bg-card-hover hover:text-foreground"
                      }`}
                    >
                      <span className="w-4 text-center text-xs opacity-70">{child.icon}</span>
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname || "/")}`;
  const { openWelcome, tourAvailable } = useTour();
  const { menuOpen: mobileOpen, closeMenu } = useMobileNav();
  const [portalReady, setPortalReady] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchTab, setMobileSearchTab] = useState<"tickers" | "sections">("tickers");
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchButtonsRef = useRef<HTMLDivElement>(null);
  const mobileSearchPanelRef = useRef<HTMLDivElement>(null);

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
    setMobileSearchQuery("");
    setMobileSearchTab("tickers");
  }, []);

  const searchResults = useMemo(
    () => filterSections(mobileSearchQuery),
    [mobileSearchQuery],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setPortalReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => closeMenu());
    return () => cancelAnimationFrame(id);
  }, [pathname, closeMenu]);

  useEffect(() => {
    const id = requestAnimationFrame(() => closeMobileSearch());
    return () => cancelAnimationFrame(id);
  }, [pathname, closeMobileSearch]);

  useEffect(() => {
    if (!mobileSearchOpen || mobileSearchTab !== "sections") return;
    const id = requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [mobileSearchOpen, mobileSearchTab]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (mobileSearchButtonsRef.current?.contains(t)) return;
      if (mobileSearchPanelRef.current?.contains(t)) return;
      closeMobileSearch();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [mobileSearchOpen, closeMobileSearch]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMobileSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSearchOpen, closeMobileSearch]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMenu]);

  return (
    <nav
      className="sticky top-10 z-40 md:top-0 flex flex-col border-b border-border bg-card/90 backdrop-blur-md pt-[env(safe-area-inset-top)]"
    >
      <div className="flex h-14 w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4">
        <Link
          href="/"
          className="flex items-center min-h-[44px] min-w-0 shrink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-lg"
        >
          <span className="block min-w-0 md:hidden">
            <Logo compact />
          </span>
          <span className="hidden md:block min-w-0">
            <Logo />
          </span>
        </Link>

        <div
          ref={mobileSearchButtonsRef}
          className="flex md:hidden items-center gap-1 shrink-0"
        >
          {status === "unauthenticated" && (
            <Link
              href={loginHref}
              className="text-accent text-[13px] font-medium px-2 min-h-[44px] flex items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Sign in
            </Link>
          )}
          {status === "authenticated" && session?.user && (
            <Link
              href="/account"
              className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              aria-label="Account"
              title={session.user.email ?? "Account"}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(201,162,39,0.15)",
                  border: "1px solid rgba(201,162,39,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "var(--color-primary)",
                  flexShrink: 0,
                }}
              >
                {userInitials(session.user)}
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              if (mobileSearchOpen) closeMobileSearch();
              else {
                closeMenu();
                setMobileSearchOpen(true);
              }
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-card-hover hover:text-foreground transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
            aria-expanded={mobileSearchOpen}
            aria-controls="gcm-mobile-search-panel"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div
          id="gcm-mobile-search-panel"
          ref={mobileSearchPanelRef}
          className="md:hidden w-full border-t border-border bg-card/90 px-3 pb-3 pt-2 sm:px-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex flex-1 flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setMobileSearchTab("tickers")}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  mobileSearchTab === "tickers"
                    ? "text-accent bg-accent/10"
                    : "text-muted hover:text-foreground bg-transparent"
                }`}
              >
                Tickers
              </button>
              <button
                type="button"
                onClick={() => setMobileSearchTab("sections")}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  mobileSearchTab === "sections"
                    ? "text-accent bg-accent/10"
                    : "text-muted hover:text-foreground bg-transparent"
                }`}
              >
                Sections
              </button>
            </div>
            <button
              type="button"
              onClick={() => closeMobileSearch()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {mobileSearchTab === "tickers" && (
            <SymbolSearch
              variant="topbar"
              placeholder="Search tickers…"
              onSelect={(symbol) => {
                router.push("/analysis?symbol=" + encodeURIComponent(symbol));
                closeMobileSearch();
              }}
            />
          )}

          {mobileSearchTab === "sections" && (
            <>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  role="combobox"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      closeMobileSearch();
                    }
                  }}
                  placeholder="Search sections…"
                  className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-autocomplete="list"
                  aria-controls="gcm-mobile-search-results"
                  aria-expanded={searchResults.length > 0}
                  aria-haspopup="listbox"
                />
              </div>
              {searchResults.length > 0 && (
                <ul
                  id="gcm-mobile-search-results"
                  role="listbox"
                  className="mt-2 max-h-[min(40vh,20rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card shadow-lg shadow-black/20"
                >
                  {searchResults.map((s) => (
                    <li key={s.href} role="option" aria-selected={false}>
                      <Link
                        href={s.href}
                        className="block border-b border-border/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-card-hover focus-visible:bg-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        onClick={() => closeMobileSearch()}
                      >
                        <span className="text-sm font-[500] text-foreground">{s.label}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted">{s.href}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {portalReady &&
        createPortal(
          <div
            className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-200 ${
              mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!mobileOpen}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px] cursor-pointer"
              aria-label="Close menu"
              onClick={() => closeMenu()}
            />
            <aside
              id="gcm-mobile-drawer"
              className={`absolute top-0 left-0 flex h-dvh min-h-0 w-[min(20.5rem,100vw)] flex-col border-r border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
                mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
              }`}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {session?.user?.name ?? session?.user?.email ?? "Account"}
                </span>
                <button
                  type="button"
                  onClick={() => closeMenu()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-card-hover hover:text-foreground transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                <Suspense
                  fallback={
                    <div className="px-3 py-6 text-sm text-muted text-center">Loading menu…</div>
                  }
                >
                  <MobileDrawerNav pathname={pathname} onNavigate={closeMenu} />
                </Suspense>

                <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
                  {tourAvailable && (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        localStorage.removeItem("gcm_tour_seen");
                        openWelcome();
                      }}
                      className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer text-left"
                    >
                      <Wand2 className="h-4 w-4 shrink-0" />
                      Take a tour
                    </button>
                  )}
                  <span className="flex items-center gap-2 px-3 py-2 text-xs text-muted break-all">
                    <User className="h-4 w-4 shrink-0" />
                    {session?.user?.email ?? "Signed in"}
                  </span>
                  <Link
                    href="/account"
                    className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer"
                    onClick={() => closeMenu()}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer text-left"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </nav>
  );
}

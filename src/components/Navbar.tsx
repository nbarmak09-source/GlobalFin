"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTour } from "@/lib/useTour";
import { Logo } from "@/components/Logo";
import { useMobileNav } from "@/components/MobileNavProvider";
import {
  LayoutDashboard,
  Search,
  LogOut,
  User,
  LineChart,
  Building2,
  ChevronDown,
  TrendingUp,
  Menu,
  X,
  Briefcase,
  Layers,
  CandlestickChart,
  Filter,
  PieChart,
  Bell,
  CalendarDays,
  Calculator,
  FileText,
  Wand2,
  Boxes,
} from "lucide-react";

// ── top-level flat links ────────────────────────────────────────────────────
const TOP_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/supply-chain", label: "Supply Chain", icon: Boxes, exact: true },
  { href: "/fixed-income", label: "Fixed Income", icon: LineChart, exact: false },
  { href: "/alternatives", label: "Alternatives", icon: Building2, exact: false },
];

// ── dropdown groups ─────────────────────────────────────────────────────────
const EQUITIES_ITEMS = [
  { href: "/ecm", label: "Equities", icon: Briefcase, desc: "Indices, sectors, deal flow & equity news" },
  { href: "/research", label: "Equity Research", icon: Search, desc: "Analyst picks, upgrades & market ideas" },
];

const INVESTING_ITEMS = [
  { href: "/portfolio", label: "Portfolio", icon: Briefcase, desc: "Positions, P&L, and watchlist" },
  { href: "/stocks", label: "Stocks", icon: CandlestickChart, desc: "Single-name fundamentals" },
  { href: "/screener", label: "Screener", icon: Filter, desc: "Filter by fundamentals" },
  { href: "/allocation", label: "Allocation", icon: PieChart, desc: "Sector & geographic exposure" },
  { href: "/alerts", label: "Price Alerts", icon: Bell, desc: "Set targets and track crossings" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, desc: "Earnings & dividend dates" },
];

const TOOLS_ITEMS = [
  { href: "/models", label: "Valuation Models", icon: Calculator, desc: "DCF, Comps, LBO" },
  { href: "/filings", label: "Filings AI", icon: FileText, desc: "AI summaries of 10-K / 10-Q" },
  { href: "/pitch", label: "Pitch Builder", icon: Wand2, desc: "AI investment memos" },
];

// ── helpers ─────────────────────────────────────────────────────────────────
function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return { open, setOpen, ref };
}

// ── sub-components ──────────────────────────────────────────────────────────
function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact: boolean;
  pathname: string;
}) {
  const active = isActive(pathname, href, exact);
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2.5 text-sm font-[500] transition-colors duration-200 min-h-[44px] border-b-[3px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
        active
          ? "text-accent border-accent"
          : "text-muted hover:text-foreground border-transparent hover:bg-card-hover rounded-lg"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function DropdownGroup({
  label,
  icon: Icon,
  items,
  pathname,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: typeof INVESTING_ITEMS;
  pathname: string;
}) {
  const { open, setOpen, ref } = useDropdown();
  const anyActive = items.some((i) => pathname.startsWith(i.href));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-[500] transition-colors duration-200 min-h-[44px] border-b-[3px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
          anyActive
            ? "text-accent border-accent"
            : "text-muted hover:text-foreground border-transparent hover:bg-card-hover rounded-lg"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-border bg-card shadow-2xl shadow-black/30 z-50 py-1.5 overflow-hidden">
          {items.map(({ href, label: itemLabel, icon: ItemIcon, desc }) => {
            const itemActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-3 py-2.5 transition-colors duration-200 cursor-pointer ${
                  itemActive
                    ? "bg-accent/10 text-accent"
                    : "text-foreground hover:bg-card-hover"
                }`}
              >
                <ItemIcon
                  className={`h-4 w-4 mt-0.5 shrink-0 ${itemActive ? "text-accent" : "text-muted"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-[500] leading-none">{itemLabel}</p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── main Navbar ─────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openWelcome } = useTour(false);
  const { menuOpen: mobileOpen, closeMenu, toggleMenu } = useMobileNav();
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);
  const {
    open: accountOpen,
    setOpen: setAccountOpen,
    ref: accountRef,
  } = useDropdown();

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

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

  // Group labels for mobile
  const mobileGroups = [
    {
      label: "Navigation",
      links: TOP_LINKS.map((l) => ({ ...l })),
    },
    {
      label: "Equities",
      links: EQUITIES_ITEMS.map((i) => ({ ...i, exact: false })),
    },
    {
      label: "Investing",
      links: INVESTING_ITEMS.map((i) => ({ ...i, exact: false })),
    },
    {
      label: "Tools",
      links: TOOLS_ITEMS.map((i) => ({ ...i, exact: false })),
    },
  ];

  return (
    <nav
      className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md pt-[env(safe-area-inset-top)]"
    >
      <div className="flex h-14 w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center min-h-[44px] min-w-0 shrink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-lg"
        >
          <span className="md:hidden">
            <Logo compact />
          </span>
          <span className="hidden md:block">
            <Logo />
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {TOP_LINKS.map(({ href, label, icon, exact }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              exact={exact}
              pathname={pathname}
            />
          ))}
          <DropdownGroup
            label="Equities"
            icon={Briefcase}
            items={EQUITIES_ITEMS}
            pathname={pathname}
          />
          <DropdownGroup
            label="Investing"
            icon={TrendingUp}
            items={INVESTING_ITEMS}
            pathname={pathname}
          />
          <DropdownGroup
            label="Tools"
            icon={Layers}
            items={TOOLS_ITEMS}
            pathname={pathname}
          />

          {/* Account */}
          <div
            ref={accountRef}
            className="ml-2 flex items-center gap-1 border-l border-border pl-2 relative"
          >
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              title={session?.user?.email ?? "Account"}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline max-w-[140px] truncate">
                {session?.user?.name ?? session?.user?.email ?? "Account"}
              </span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${accountOpen ? "rotate-180" : ""}`}
              />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-card shadow-2xl shadow-black/30 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    localStorage.removeItem("gcm_tour_seen");
                    openWelcome();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-foreground w-full text-left transition-colors duration-200 hover:bg-card-hover cursor-pointer"
                >
                  <Wand2 className="h-4 w-4" />
                  <span>Take a tour</span>
                </button>
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors duration-200 cursor-pointer"
                  onClick={() => setAccountOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-card-hover hover:text-foreground transition-colors duration-200 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <button
            type="button"
            onClick={() => toggleMenu()}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-card-hover hover:text-foreground transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="gcm-mobile-drawer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile: backdrop + drawer — portaled to body so position:fixed is not clipped by nav backdrop-blur (Safari/WebKit containing block). */}
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
              className={`absolute top-0 right-0 flex h-dvh min-h-0 w-[min(20.5rem,100vw)] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
                mobileOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
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
                {mobileGroups.map(({ label: groupLabel, links }) => (
                  <div key={groupLabel} className="mb-3">
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
                      {groupLabel}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {links.map(({ href, label, icon: Icon, exact }) => {
                        const active = isActive(pathname, href, exact);
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => closeMenu()}
                            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-[500] transition-colors cursor-pointer ${
                              active
                                ? "bg-accent/10 text-accent"
                                : "text-muted hover:bg-card-hover hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
                  <span className="flex items-center gap-2 px-3 py-2 text-xs text-muted break-all">
                    <User className="h-4 w-4 shrink-0" />
                    {session?.user?.email ?? "Signed in"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      localStorage.removeItem("gcm_tour_seen");
                      openWelcome();
                    }}
                    className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer"
                  >
                    <Wand2 className="h-4 w-4 shrink-0" />
                    Take a tour
                  </button>
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
                    className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </nav>
  );
}

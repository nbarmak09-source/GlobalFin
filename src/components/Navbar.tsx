"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTour } from "@/lib/useTour";
import {
  LayoutDashboard,
  Search,
  Globe2,
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
  { href: "/research", label: "Research", icon: Search, exact: false },
  { href: "/fixed-income", label: "Fixed Income", icon: LineChart, exact: false },
  { href: "/alternatives", label: "Alternatives", icon: Building2, exact: false },
  { href: "/ecm", label: "Equities", icon: Briefcase, exact: false },
];

// ── dropdown groups ─────────────────────────────────────────────────────────
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
      className={`flex items-center gap-2 px-3 py-2.5 text-sm font-[500] transition-colors min-h-[44px] border-b-[3px] ${
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
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-[500] transition-colors min-h-[44px] border-b-[3px] ${
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
        <div className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-border bg-card shadow-xl z-50 py-1.5 overflow-hidden">
          {items.map(({ href, label: itemLabel, icon: ItemIcon, desc }) => {
            const itemActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
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
  const { startTour } = useTour(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    open: accountOpen,
    setOpen: setAccountOpen,
    ref: accountRef,
  } = useDropdown();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Group labels for mobile
  const mobileGroups = [
    {
      label: "Navigation",
      links: TOP_LINKS.map((l) => ({ ...l })),
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
      className="border-b border-border bg-card"
      style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
    >
      <div className="flex h-14 w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-base sm:text-lg font-bold font-serif text-accent min-h-[44px]"
        >
          <Globe2 className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
          <span className="md:hidden truncate max-w-[120px]">GCM HQ</span>
          <span className="hidden md:inline truncate">Global Capital Markets HQ</span>
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
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors"
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
              <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-border bg-card shadow-lg z-50">
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-card-hover hover:text-foreground"
                  onClick={() => setAccountOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>View account</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    localStorage.removeItem("gcm_tour_seen");
                    startTour();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-foreground w-full text-left transition-colors hover:bg-card-hover"
                >
                  <Wand2 className="h-4 w-4" />
                  <span>Take a tour</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-card-hover hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <span className="text-xs text-muted truncate max-w-[80px]">
            {session?.user?.name ?? "You"}
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-card-hover hover:text-foreground transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      <div
        className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex flex-col h-full pt-16 pb-8 px-4 overflow-y-auto">
          {mobileGroups.map(({ label: groupLabel, links }) => (
            <div key={groupLabel} className="mb-4">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
                {groupLabel}
              </p>
              <div className="flex flex-col gap-0.5">
                {links.map(({ href, label, icon: Icon, exact }) => {
                  const active = isActive(pathname, href, exact);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-[500] transition-colors min-h-[44px] ${
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-muted hover:text-foreground hover:bg-card-hover"
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

          {/* Account section */}
          <div className="mt-auto pt-4 border-t border-border flex flex-col gap-1">
            <span className="px-3 py-2 text-xs text-muted flex items-center gap-2">
              <User className="h-4 w-4" />
              {session?.user?.email ?? "Signed in"}
            </span>
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
            >
              <User className="h-4 w-4" />
              Account
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                localStorage.removeItem("gcm_tour_seen");
                startTour();
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
            >
              <Wand2 className="h-4 w-4" />
              Take a tour
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

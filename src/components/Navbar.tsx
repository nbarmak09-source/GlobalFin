"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Search,
  Briefcase,
  CandlestickChart,
  Globe2,
  FileText,
  LogOut,
  User,
  LineChart,
  Building2,
  ChevronDown,
  TrendingUp,
  Filter,
  CalendarDays,
  PieChart,
  Bell,
  Calculator,
  Menu,
  X,
} from "lucide-react";

const dashboardTab = { href: "/", label: "Dashboard", icon: LayoutDashboard };
const tabs = [
  { href: "/research", label: "Research", icon: Search },
  { href: "/investing", label: "Investing", icon: TrendingUp },
  { href: "/fixed-income", label: "Fixed Income & Credit", icon: LineChart },
  {
    href: "/alternatives",
    label: "Alt Assets & Real Estate",
    icon: Building2,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const ecmActive = pathname.startsWith("/ecm");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinks = (
    <>
      <Link
        href={dashboardTab.href}
        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
          pathname === "/"
            ? "bg-accent/15 text-accent"
            : "text-muted hover:text-foreground hover:bg-card-hover"
        }`}
      >
        <dashboardTab.icon className="h-4 w-4 shrink-0" />
        {dashboardTab.label}
      </Link>
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
              isActive
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
      <Link
        href="/ecm"
        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
          ecmActive
            ? "bg-accent/15 text-accent"
            : "text-muted hover:text-foreground hover:bg-card-hover"
        }`}
      >
        <Briefcase className="h-4 w-4 shrink-0" />
        ECM
      </Link>
    </>
  );

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex h-14 w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-base sm:text-lg font-bold font-serif text-accent min-h-[44px] items-center"
        >
          <Globe2 className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
          <span className="md:hidden truncate max-w-[120px]">GCM HQ</span>
          <span className="hidden md:inline truncate">Global Capital Markets HQ</span>
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks}
          <div className="ml-2 flex items-center gap-1 border-l border-border pl-2">
            <span
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted max-w-[120px] truncate"
              title={session?.user?.email ?? "Signed in"}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline truncate">
                {session?.user?.name ?? session?.user?.email ?? "You"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        {/* Mobile menu button */}
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
      {/* Mobile menu panel */}
      <div
        className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden transition-opacity duration-200 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex flex-col h-full pt-16 pb-8 px-4 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {navLinks}
          </div>
          <div className="mt-6 pt-4 border-t border-border flex flex-col gap-1">
            <span className="px-3 py-2 text-xs text-muted flex items-center gap-2">
              <User className="h-4 w-4" />
              {session?.user?.email ?? "Signed in"}
            </span>
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


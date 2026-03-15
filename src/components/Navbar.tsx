"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

const dashboardTab = { href: "/", label: "Dashboard", icon: LayoutDashboard };
const tabs = [
  { href: "/research", label: "Research", icon: Search },
  { href: "/fixed-income", label: "Fixed Income & Credit", icon: LineChart },
  {
    href: "/alternatives",
    label: "Alt Assets & Real Estate",
    icon: Building2,
  },
];

const investingLinks = [
  { href: "/investing", label: "Overview", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/stocks", label: "Stocks", icon: CandlestickChart },
  { href: "/pitch", label: "Pitch", icon: FileText },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/allocation", label: "Allocation", icon: PieChart },
  { href: "/alerts", label: "Price Alerts", icon: Bell },
  { href: "/models", label: "Models", icon: Calculator },
];

const INVESTING_PREFIXES = [
  "/investing",
  "/portfolio",
  "/stocks",
  "/pitch",
  "/screener",
  "/calendar",
  "/allocation",
  "/alerts",
  "/models",
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [investingOpen, setInvestingOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const investingActive = INVESTING_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  const ecmActive = pathname.startsWith("/ecm");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setInvestingOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex h-14 w-full min-w-0 items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold font-serif text-accent"
        >
          <Globe2 className="h-6 w-6" />
          <span>Global Capital Markets HQ</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href={dashboardTab.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <dashboardTab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{dashboardTab.label}</span>
          </Link>

          {tabs.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          <Link
            href="/ecm"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              ecmActive
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">ECM</span>
          </Link>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setInvestingOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                investingActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Investing</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {investingOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-card border border-border shadow-xl z-40 overflow-hidden">
                {investingLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-card-hover transition-colors"
                    onClick={() => setInvestingOpen(false)}
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

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
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-card-hover transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


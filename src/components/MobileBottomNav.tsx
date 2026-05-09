"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Briefcase,
  MoreHorizontal,
} from "lucide-react";
import { useMobileNav } from "@/components/MobileNavProvider";

function isActivePath(pathname: string, href: string, exact: boolean) {
  if (href === "/dashboard" && exact) {
    return pathname === "/" || pathname === "/dashboard";
  }
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase, exact: false },
  { href: "/analysis", label: "Analysis", icon: Search, exact: false },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { menuOpen, openMenu, closeMenu } = useMobileNav();

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-30 md:hidden transition-all duration-200 ${
        menuOpen ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100 translate-y-0"
      }`}
      style={{
        background: "rgba(11,11,15,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
        willChange: "transform",
      }}
      aria-label="Primary navigation"
    >
      <div
        className="mx-auto flex max-w-7xl items-stretch justify-around px-2"
        style={{ height: 64 }}
      >
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActivePath(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => closeMenu()}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-muted)",
                transition: "all 0.2s ease",
                outline: "none",
              }}
            >
              {/* Active pill indicator */}
              <span
                style={{
                  display: "block",
                  width: 20,
                  height: 3,
                  borderRadius: 2,
                  background: active ? "var(--color-primary)" : "transparent",
                  marginBottom: 4,
                  transition: "all 0.2s ease",
                }}
                aria-hidden="true"
              />
              <div
                className="flex items-center justify-center rounded-lg px-3 py-0.5 transition-all duration-200"
                style={{
                  background: active ? "rgba(201,162,39,0.1)" : "transparent",
                }}
              >
                <Icon
                  className="h-[22px] w-[22px] shrink-0"
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </div>
              <span
                className="truncate max-w-full"
                style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.02em",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* More / drawer trigger */}
        <button
          type="button"
          onClick={() => openMenu()}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            color: menuOpen ? "var(--color-primary)" : "var(--color-muted)",
            transition: "all 0.2s ease",
            border: "none",
            background: "transparent",
            willChange: "transform",
          }}
          aria-expanded={menuOpen}
          aria-controls="gcm-mobile-drawer"
        >
          {/* Pill placeholder to keep vertical rhythm */}
          <span
            style={{
              display: "block",
              width: 20,
              height: 3,
              borderRadius: 2,
              background: menuOpen ? "var(--color-primary)" : "transparent",
              marginBottom: 4,
              transition: "all 0.2s ease",
            }}
            aria-hidden="true"
          />
          <div
            className="flex items-center justify-center rounded-lg px-3 py-0.5 transition-all duration-200"
            style={{
              background: menuOpen ? "rgba(201,162,39,0.1)" : "transparent",
            }}
          >
            <MoreHorizontal
              className="h-[22px] w-[22px] shrink-0"
              strokeWidth={menuOpen ? 2.25 : 1.75}
            />
          </div>
          <span
            className="truncate max-w-full"
            style={{
              fontSize: 10,
              fontWeight: menuOpen ? 600 : 400,
              fontFamily: "var(--font-body)",
              letterSpacing: "0.02em",
            }}
          >
            More
          </span>
        </button>
      </div>
    </nav>
  );
}

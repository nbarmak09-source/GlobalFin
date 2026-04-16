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
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

const ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/research", label: "Research", icon: Search, exact: false },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase, exact: false },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { menuOpen, openMenu, closeMenu } = useMobileNav();

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden transition-[opacity,transform] duration-200 ease-out ${
        menuOpen
          ? "pointer-events-none translate-y-2 opacity-0"
          : "translate-y-0 opacity-100"
      }`}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-7xl items-stretch justify-around gap-0 px-1 pt-1">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActivePath(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => closeMenu()}
              className={`flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight transition-[color,transform] duration-200 cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? "text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {active ? (
                <div className="rounded-lg bg-accent/12 px-2">
                  <Icon
                    className="h-[22px] w-[22px] shrink-0 text-accent"
                    strokeWidth={2.25}
                  />
                </div>
              ) : (
                <Icon
                  className="h-[22px] w-[22px] shrink-0"
                  strokeWidth={2}
                />
              )}
              <span className="truncate max-w-full">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => openMenu()}
          className="flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight text-muted transition-[color,transform] duration-200 hover:text-foreground cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-expanded={menuOpen}
          aria-controls="gcm-mobile-drawer"
        >
          <MoreHorizontal className="h-[22px] w-[22px] shrink-0" strokeWidth={2} />
          <span className="truncate max-w-full">More</span>
        </button>
      </div>
    </nav>
  );
}

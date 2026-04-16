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
      className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/98 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden transition-all duration-200 ${
        menuOpen ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100 translate-y-0"
      }`}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-7xl items-stretch justify-around px-2 pt-1.5 pb-0.5">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActivePath(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => closeMenu()}
              className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold leading-tight transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-lg transition-all duration-200 px-3 py-0.5 ${
                  active ? "bg-accent/[0.12]" : ""
                }`}
              >
                <Icon
                  className="h-[22px] w-[22px] shrink-0"
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </div>
              <span className="truncate max-w-full">{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => openMenu()}
          className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold leading-tight transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            menuOpen ? "text-accent" : "text-muted hover:text-foreground"
          }`}
          aria-expanded={menuOpen}
          aria-controls="gcm-mobile-drawer"
        >
          <div
            className={`flex items-center justify-center rounded-lg transition-all duration-200 px-3 py-0.5 ${
              menuOpen ? "bg-accent/[0.12]" : ""
            }`}
          >
            <MoreHorizontal
              className="h-[22px] w-[22px] shrink-0"
              strokeWidth={menuOpen ? 2.25 : 1.75}
            />
          </div>
          <span className="truncate max-w-full">More</span>
        </button>
      </div>
    </nav>
  );
}

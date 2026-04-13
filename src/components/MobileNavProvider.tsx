"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileNavContextValue = {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const value = useMemo(
    () => ({ menuOpen, openMenu, closeMenu, toggleMenu }),
    [menuOpen, openMenu, closeMenu, toggleMenu]
  );

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within MobileNavProvider");
  }
  return ctx;
}

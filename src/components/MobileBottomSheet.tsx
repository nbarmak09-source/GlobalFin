"use client";

/**
 * MobileBottomSheet
 *
 * A native-feeling sheet that slides up from the bottom on mobile,
 * and renders as a centred modal on md+ screens.
 *
 * Usage:
 *   <MobileBottomSheet open={open} onClose={() => setOpen(false)} title="Filters">
 *     <p>Your content here</p>
 *   </MobileBottomSheet>
 */

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Show the drag handle bar at the top */
  showHandle?: boolean;
  children: ReactNode;
  /** Extra classes on the sheet panel */
  className?: string;
}

export default function MobileBottomSheet({
  open,
  onClose,
  title,
  showHandle = true,
  children,
  className = "",
}: MobileBottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Trap focus inside panel
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [open]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-50 transition-all duration-200 ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet panel */}
      <div
        ref={panelRef}
        className={`
          absolute
          /* Mobile: slide up from bottom */
          bottom-0 left-0 right-0
          rounded-t-[1.25rem]
          /* Desktop: centred modal */
          md:bottom-auto md:top-1/2 md:left-1/2
          md:-translate-x-1/2 md:-translate-y-1/2
          md:right-auto md:w-full md:max-w-md md:rounded-2xl
          bg-card border border-border shadow-2xl shadow-black/50
          transition-all duration-300 ease-out
          max-h-[92dvh] flex flex-col
          pb-[env(safe-area-inset-bottom)] md:pb-0
          ${open
            ? "translate-y-0 opacity-100 md:scale-100"
            : "translate-y-full opacity-0 md:translate-y-[-48%] md:scale-95"
          }
          ${className}
        `}
      >
        {/* Drag handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Close button without title */}
        {!title && (
          <div className="flex justify-end px-4 pt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}

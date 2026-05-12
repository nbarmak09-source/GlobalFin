"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TourStep } from "@/lib/tourSteps";
import {
  LayoutDashboard,
  Boxes,
  Search,
  CandlestickChart,
  Calculator,
  Wand2,
  FileText,
  Briefcase,
  Filter,
  LineChart,
  Bell,
  Globe,
  TrendingUp,
  BarChart3,
  Layers,
  type LucideIcon,
} from "lucide-react";

const HIGHLIGHT_CLASS = "gcm-tour-highlight";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Boxes,
  Search,
  CandlestickChart,
  Calculator,
  Wand2,
  FileText,
  Briefcase,
  Filter,
  LineChart,
  Bell,
  Globe,
  TrendingUp,
  BarChart3,
  Layers,
};

function findAttachTarget(selector?: string): HTMLElement | null {
  if (!selector || typeof document === "undefined") return null;
  const nodes = document.querySelectorAll(selector);
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i] as HTMLElement;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

type Props = {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
};

export default function StepTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onClose,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      setEntered(false);
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [step.id]);

  useEffect(() => {
    function clearHighlight() {
      if (highlightRef.current) {
        highlightRef.current.classList.remove(HIGHLIGHT_CLASS);
        highlightRef.current = null;
      }
    }

    function update() {
      clearHighlight();
      const target = findAttachTarget(step.attachTo);
      if (target) {
        highlightRef.current = target;
        target.classList.add(HIGHLIGHT_CLASS);
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      const cardW = cardRef.current?.offsetWidth ?? 400;
      const cardH = cardRef.current?.offsetHeight ?? 320;
      const margin = 12;
      const vw = typeof window !== "undefined" ? window.innerWidth : 0;
      const vh = typeof window !== "undefined" ? window.innerHeight : 0;

      if (target) {
        const r = target.getBoundingClientRect();
        let left = r.left + r.width / 2 - cardW / 2;
        let top = r.bottom + margin;
        left = Math.max(margin, Math.min(left, vw - cardW - margin));
        if (top + cardH > vh - margin) {
          top = Math.max(margin, r.top - cardH - margin);
        }
        setPos({ left, top });
      } else {
        setPos({
          left: Math.max(margin, (vw - cardW) / 2),
          top: Math.max(margin, (vh - cardH) / 2),
        });
      }
    }

    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro && cardRef.current) ro.observe(cardRef.current);

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      clearHighlight();
      ro?.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [step.attachTo, step.id]);

  const Icon = ICON_MAP[step.icon] ?? LayoutDashboard;
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <>
      <div
        className="fixed inset-0 z-[190] bg-black/35"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={cardRef}
        className="fixed z-[200] max-w-[400px] w-[min(400px,calc(100vw-32px))] rounded-[14px] border border-border bg-card shadow-[0_24px_48px_rgba(0,0,0,0.5)] transition-[opacity,transform] duration-200"
        style={{
          left: pos?.left ?? 16,
          top: pos?.top ?? 16,
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(8px)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tour-step-title-${step.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex gap-3 border-b border-card-hover px-5 py-4">
          <div
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-accent/12 border border-accent/25"
          >
            <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {step.tag}
            </p>
            <h2
              id={`tour-step-title-${step.id}`}
              className="font-serif text-[17px] font-semibold leading-snug text-foreground"
            >
              {step.title}
            </h2>
          </div>
        </header>

        <div className="px-5 py-4">
          <p className="text-[13px] leading-[1.65] text-muted">{step.description}</p>
          <ul className="mt-3 space-y-2">
            {step.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-left">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <span className="text-xs leading-relaxed text-muted">{b}</span>
              </li>
            ))}
          </ul>
          {step.highlight ? (
            <div
              className="mt-4 rounded-lg border border-accent/15 bg-accent/[0.06] px-3 py-2.5 text-xs leading-relaxed text-accent/95"
            >
              <span className="mr-1">★</span>
              {step.highlight}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col gap-3 border-t border-card-hover px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-[3px] w-20 overflow-hidden rounded-full bg-card-hover"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted">
              {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={stepIndex === 0}
              className="rounded-lg border border-border bg-transparent px-3 py-2 text-xs font-medium text-muted transition-colors duration-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-background transition-all duration-200 hover:bg-accent-hover cursor-pointer"
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

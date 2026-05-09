"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type TourContextValue = {
  /** False below Tailwind `md` (768px); intro tour is desktop-only */
  tourAvailable: boolean;
  isWelcomeOpen: boolean;
  isRunning: boolean;
  isDone: boolean;
  currentStep: number;
  openWelcome: () => void;
  startTour: () => void;
  dismissAll: () => void;
  nextStep: (totalSteps: number) => void;
  prevStep: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

/** Same breakpoint as Tailwind `md` — tour UI runs only at this width and above */
export function useTourDesktopViewport(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setOk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return ok;
}

function useTourState(enabled: boolean, autoStart: boolean) {
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const hasCheckedRef = useRef(false);

  const startTour = useCallback(() => {
    if (!enabled) return;
    setCurrentStep(0);
    setIsDone(false);
    setIsWelcomeOpen(false);
    setIsRunning(true);
  }, [enabled]);

  const openWelcome = useCallback(() => {
    if (!enabled) return;
    setIsDone(false);
    setIsRunning(false);
    setIsWelcomeOpen(true);
  }, [enabled]);

  const dismissAll = useCallback(() => {
    setIsWelcomeOpen(false);
    setIsRunning(false);
    setIsDone(false);
    try {
      localStorage.setItem("gcm_tour_seen", "true");
    } catch {
      // Private browsing — silently ignore
    }
  }, []);

  const nextStep = useCallback(
    (totalSteps: number) => {
      if (!enabled) return;
      setCurrentStep((s) => {
        if (s >= totalSteps - 1) {
          setIsRunning(false);
          setIsDone(true);
          return s;
        }
        return s + 1;
      });
    },
    [enabled]
  );

  const prevStep = useCallback(() => {
    if (!enabled) return;
    setCurrentStep((s) => Math.max(0, s - 1));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      hasCheckedRef.current = false;
      setIsWelcomeOpen(false);
      setIsRunning(false);
      setIsDone(false);
      return;
    }
    if (!autoStart) return;
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    let seen = false;
    try {
      seen = !!localStorage.getItem("gcm_tour_seen");
    } catch {
      // Private browsing / storage blocked — treat as seen
      // so the modal never re-fires on every revalidation.
      seen = true;
    }

    if (!seen) {
      const t = setTimeout(() => setIsWelcomeOpen(true), 1000);
      return () => clearTimeout(t);
    }
  }, [enabled, autoStart]);

  return useMemo(
    () => ({
      tourAvailable: enabled,
      isWelcomeOpen,
      isRunning,
      isDone,
      currentStep,
      openWelcome,
      startTour,
      dismissAll,
      nextStep,
      prevStep,
    }),
    [
      enabled,
      isWelcomeOpen,
      isRunning,
      isDone,
      currentStep,
      openWelcome,
      startTour,
      dismissAll,
      nextStep,
      prevStep,
    ]
  );
}

export function TourProvider({
  children,
  enabled = true,
  autoStart = false,
}: {
  children: React.ReactNode;
  /** When false (e.g. mobile viewport), tour modals and auto-start are disabled */
  enabled?: boolean;
  autoStart?: boolean;
}) {
  const value = useTourState(enabled, autoStart);
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider");
  }
  return ctx;
}

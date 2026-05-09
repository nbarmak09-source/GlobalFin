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
import { useSession } from "next-auth/react";

export type TourContextValue = {
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

function useTourState(autoStart: boolean) {
  const { data: session } = useSession();
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const hasCheckedRef = useRef(false);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsDone(false);
    setIsWelcomeOpen(false);
    setIsRunning(true);
  }, []);

  const openWelcome = useCallback(() => {
    setIsDone(false);
    setIsRunning(false);
    setIsWelcomeOpen(true);
  }, []);

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

  const nextStep = useCallback((totalSteps: number) => {
    setCurrentStep((s) => {
      if (s >= totalSteps - 1) {
        setIsRunning(false);
        setIsDone(true);
        return s;
      }
      return s + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  useEffect(() => {
    if (!autoStart || !session) return;
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    let seen = false;
    try {
      seen = !!localStorage.getItem("gcm_tour_seen");
    } catch {
      // Private browsing or storage unavailable — treat as seen
      // to avoid the modal re-appearing on every revalidation.
      seen = true;
    }

    if (!seen) {
      const t = setTimeout(() => setIsWelcomeOpen(true), 1000);
      return () => clearTimeout(t);
    }
  }, [session, autoStart]);

  return useMemo(
    () => ({
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
  autoStart = false,
}: {
  children: React.ReactNode;
  autoStart?: boolean;
}) {
  const value = useTourState(autoStart);
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider");
  }
  return ctx;
}

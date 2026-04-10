"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
    localStorage.setItem("gcm_tour_seen", "true");
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
    const seen = localStorage.getItem("gcm_tour_seen");
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

export function useTour(_autoStart?: boolean) {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider");
  }
  return ctx;
}

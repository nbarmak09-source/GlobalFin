"use client";

import { TourProvider } from "@/lib/useTour";
import TourController from "@/components/tour/TourController";

export default function AppTourShell({ children }: { children: React.ReactNode }) {
  return (
    <TourProvider autoStart>
      <TourController />
      {children}
    </TourProvider>
  );
}

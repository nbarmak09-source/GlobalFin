"use client";

import { TourProvider, useTourDesktopViewport } from "@/lib/useTour";
import TourController from "@/components/tour/TourController";

export default function AppTourShell({ children }: { children: React.ReactNode }) {
  const tourDesktop = useTourDesktopViewport();
  return (
    <TourProvider enabled={tourDesktop} autoStart={tourDesktop}>
      <TourController />
      {children}
    </TourProvider>
  );
}

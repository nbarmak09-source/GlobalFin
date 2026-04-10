"use client";

import { useTour } from "@/lib/useTour";

export default function TourStarter() {
  useTour(true);
  return null;
}

/**
 * DEMO ONLY — Remove this entire folder to delete the demo:
 *   src/app/demo-saas/
 */
import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Flowline — Demo SaaS",
  description: "Throwaway demo landing (UI/UX Pro Max).",
  robots: { index: false, follow: false },
};

export default function DemoSaasLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${plusJakarta.className} min-h-screen bg-[#F8FAFC] text-[#020617] antialiased selection:bg-sky-200/60`}
    >
      {children}
    </div>
  );
}

// GlobalFin — Root Layout
// Uses next/font for Space Grotesk + Inter (NOT Google Fonts <link> tags —
// those cause FOUT and don't work with Next.js font optimization)

import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { auth } from "@/lib/auth";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";

/* ----------------------------------------------------------------
   FONT SETUP
   next/font automatically:
   - Self-hosts fonts (no external requests)
   - Adds font-display: swap
   - Generates CSS variables referenced in globals.css (@theme / :root)
   ---------------------------------------------------------------- */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
});

/* ----------------------------------------------------------------
   METADATA
   ---------------------------------------------------------------- */

export const metadata: Metadata = {
  title: {
    default: "GlobalFin",
    template: "%s | GlobalFin",
  },
  description:
    "Institutional-grade market intelligence, execution systems, and analytics designed for modern finance.",
  keywords: [
    "capital markets",
    "market intelligence",
    "institutional finance",
    "portfolio analytics",
    "fixed income",
    "equities",
    "alternatives",
  ],
  authors: [{ name: "GlobalFin" }],
  creator: "GlobalFin",
  icons: {
    // repo ships logo.svg; add /favicon.ico when available
    icon: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "GlobalFin",
    title: "GlobalFin",
    description:
      "Institutional-grade market intelligence and analytics. Smarter markets, better outcomes.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0F",
  colorScheme: "dark",
};

/* ----------------------------------------------------------------
   LAYOUT
   ---------------------------------------------------------------- */

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const devBypass = isDevAuthBypassEnabled();

  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${spaceGrotesk.variable} gcm-hide-ticker`}
      suppressHydrationWarning
    >
      <body
        className="bg-background text-foreground font-sans antialiased min-h-dvh overflow-x-hidden"
        suppressHydrationWarning
      >
        <SessionProvider
          session={session}
          refetchOnWindowFocus={!devBypass}
        >
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

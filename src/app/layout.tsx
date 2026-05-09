// GLOBALFIN Capital Markets — Root Layout
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
    default: "GLOBALFIN Capital Markets",
    template: "%s | GLOBALFIN Capital Markets",
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
  authors: [{ name: "GLOBALFIN Capital Markets" }],
  creator: "GLOBALFIN Capital Markets",
  icons: {
    // repo ships logo.svg; add /favicon.ico when available
    icon: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "GLOBALFIN Capital Markets",
    title: "GLOBALFIN Capital Markets",
    description:
      "Precision Infrastructure for Global Capital Markets. Smarter Markets. Better Outcomes.",
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

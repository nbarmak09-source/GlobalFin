import type { Metadata } from "next";
import { Source_Sans_3, Libre_Baskerville, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import SessionProvider from "@/components/SessionProvider";

const sourceSans = Source_Sans_3({
  variable: "--font-sans-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Global Capital Markets HQ",
  description: "Global Capital Markets HQ - Personal stock market dashboard with live data, research, and portfolio tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${sourceSans.variable} ${libreBaskerville.variable} ${ibmPlexMono.variable} font-sans antialiased min-h-screen w-full overflow-x-hidden flex flex-col`}
      >
        <SessionProvider>
          <TickerTape />
          <Navbar />
          <main className="flex-1 mx-auto max-w-7xl w-full min-w-0 px-4 py-6">{children}</main>
          <footer className="border-t border-border py-4">
            <p className="text-center text-xs text-muted max-w-2xl mx-auto px-4">
              Data and analysis are for informational purposes only and do not constitute financial, investment, or legal advice.
            </p>
            <p className="text-center text-xs text-muted mt-2">
              Questions or concerns?{" "}
              <a
                href="mailto:nbarmak09@gmail.com"
                className="text-accent hover:underline"
              >
                nbarmak09@gmail.com
              </a>
            </p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}

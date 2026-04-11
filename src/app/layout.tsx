import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Lexend, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

const sourceSans = Source_Sans_3({
  variable: "--font-sans-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const lexend = Lexend({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Global Capital Markets HQ",
  description:
    "Global Capital Markets HQ - Personal stock market dashboard with live data, research, and portfolio tracking",
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${sourceSans.variable} ${lexend.variable} ${ibmPlexMono.variable} font-sans antialiased min-h-screen w-full overflow-x-hidden flex flex-col`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

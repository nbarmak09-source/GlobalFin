import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Capital Markets Hub",
  description:
    "Capital Markets Hub - Personal stock market dashboard with live data, research, and portfolio tracking",
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className="bg-[#0d1117] gcm-hide-ticker"
      suppressHydrationWarning
    >
      <body
        className="bg-[--bg-base] text-[--text-primary] font-sans antialiased min-h-dvh"
        suppressHydrationWarning
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

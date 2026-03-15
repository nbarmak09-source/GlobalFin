"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your monitoring service in production (e.g. Sentry)
    console.error("Application error:", error?.message ?? error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
        Something went wrong
      </h1>
      <p className="text-muted mb-8 max-w-md">
        We ran into an unexpected error. Please try again or return to the dashboard.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-accent/20 text-accent px-4 py-2.5 text-sm font-medium hover:bg-accent/30 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-card hover:bg-card-hover border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}

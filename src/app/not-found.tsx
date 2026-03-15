import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold font-serif text-accent mb-2">404</h1>
      <p className="text-xl text-foreground mb-1">Page not found</p>
      <p className="text-muted mb-8 max-w-md">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-accent/20 text-accent px-4 py-2.5 text-sm font-medium hover:bg-accent/30 transition-colors"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/research"
          className="inline-flex items-center gap-2 rounded-lg bg-card hover:bg-card-hover border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
          Research
        </Link>
      </div>
    </div>
  );
}

"use client";

export function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-md bg-card animate-pulse ${className}`}
      style={{ opacity: 0.6 }}
    />
  );
}

export function SkeletonText({ width = "w-full" }: { width?: string }) {
  return <SkeletonBlock className={`h-4 ${width}`} />;
}

export function SkeletonNumber() {
  return <SkeletonBlock className="h-8 w-24" />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonText key={i} width={i === 0 ? "w-1/2" : "w-full"} />
      ))}
    </div>
  );
}

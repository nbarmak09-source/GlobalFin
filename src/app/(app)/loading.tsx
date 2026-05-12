export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse" aria-label="Loading…">
      {/* Page title skeleton */}
      <div className="h-5 w-48 rounded-lg bg-white/5 mt-1" />

      {/* Card row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>

      {/* Wide card */}
      <div className="h-48 rounded-xl bg-white/5" />

      {/* Two-column cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-36 rounded-xl bg-white/5" />
        <div className="h-36 rounded-xl bg-white/5" />
      </div>

      {/* Table-like rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}

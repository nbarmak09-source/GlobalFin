import type { ExtendedHoursLine } from "@/lib/extendedHours";

interface ExtendedHoursInlineProps {
  line: ExtendedHoursLine;
  className?: string;
  /** Smaller copy for dense tables */
  compact?: boolean;
}

/** One-line pre-market / after-hours price and move (Yahoo-style). */
export default function ExtendedHoursInline({
  line,
  className = "",
  compact = false,
}: ExtendedHoursInlineProps) {
  const up = line.change >= 0;
  const textSize = compact ? "text-[10px]" : "text-xs";
  return (
    <div
      className={`${textSize} font-mono tabular-nums ${up ? "text-green" : "text-red"} ${className}`}
    >
      <span className="text-muted font-normal">{line.label}: </span>
      <span className="font-medium">
        $
        {line.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        ({up ? "+" : ""}
        {line.change.toFixed(2)}, {up ? "+" : ""}
        {line.changePercent.toFixed(2)}%)
      </span>
    </div>
  );
}

import type { ExtendedHoursLine } from "@/lib/extendedHours";

interface ExtendedHoursInlineProps {
  line: ExtendedHoursLine;
  className?: string;
  /** Smaller copy for dense tables */
  compact?: boolean;
  /** Use short labels (AH / Pre) so price + session fit tighter rows */
  abbreviateLabel?: boolean;
}

/** One-line pre-market / after-hours price and move (Yahoo-style). */
export default function ExtendedHoursInline({
  line,
  className = "",
  compact = false,
  abbreviateLabel = false,
}: ExtendedHoursInlineProps) {
  const up = line.change >= 0;
  const textSize = compact ? "text-[10px]" : "text-xs";
  const label = abbreviateLabel
    ? line.session === "pre"
      ? "Pre"
      : "AH"
    : line.label;
  return (
    <div
      className={`${textSize} font-mono tabular-nums ${up ? "text-green" : "text-red"} ${className}`}
    >
      <span className="text-muted font-normal">{label}: </span>
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

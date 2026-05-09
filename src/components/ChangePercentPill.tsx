export function formatSignedPercentPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function ChangePercentPill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums whitespace-nowrap ${
        positive ? "bg-green/10 text-green" : "bg-red/10 text-red"
      }`}
    >
      {formatSignedPercentPct(value)}
    </span>
  );
}

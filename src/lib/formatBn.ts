/** Format USD billions for display (one decimal). */
export function fmtBn(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${Number(value).toFixed(1)}B`;
}

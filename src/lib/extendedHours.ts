/**
 * Yahoo Finance quote fields for pre-market and after-hours sessions.
 * Used for compact headers and portfolio rows.
 */

export interface ExtendedHoursFields {
  marketState?: string;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
}

export interface ExtendedHoursLine {
  session: "pre" | "post";
  label: "Pre-market" | "After hours";
  price: number;
  change: number;
  changePercent: number;
  /** Regular-session previous close (Yahoo); optional, merged from quote when present */
  previousClose?: number;
}

/** Single-line summary: prefer the session Yahoo marks active, else show post then pre when prices exist. */
export function getExtendedHoursLine(
  q: ExtendedHoursFields
): ExtendedHoursLine | null {
  const ms = (q.marketState ?? "").toUpperCase();
  const prePx = q.preMarketPrice;
  const postPx = q.postMarketPrice;
  const preOk = typeof prePx === "number" && prePx > 0;
  const postOk = typeof postPx === "number" && postPx > 0;

  if (preOk && (ms.includes("PRE") || ms === "PREMARKET")) {
    return {
      session: "pre",
      label: "Pre-market",
      price: prePx,
      change: q.preMarketChange ?? 0,
      changePercent: q.preMarketChangePercent ?? 0,
    };
  }
  if (postOk && (ms.includes("POST") || ms === "POSTPOST")) {
    return {
      session: "post",
      label: "After hours",
      price: postPx,
      change: q.postMarketChange ?? 0,
      changePercent: q.postMarketChangePercent ?? 0,
    };
  }
  if (postOk) {
    return {
      session: "post",
      label: "After hours",
      price: postPx,
      change: q.postMarketChange ?? 0,
      changePercent: q.postMarketChangePercent ?? 0,
    };
  }
  if (preOk) {
    return {
      session: "pre",
      label: "Pre-market",
      price: prePx,
      change: q.preMarketChange ?? 0,
      changePercent: q.preMarketChangePercent ?? 0,
    };
  }
  return null;
}

/**
 * US equity regular session (NYSE/Nasdaq): 9:30 AM – 4:00 PM America/New_York.
 * Pre-market (4:00–9:30) and after-hours (4:00–8:00) are informational only.
 * Early closes (e.g. day before Thanksgiving) are not modeled here.
 */

const TZ = "America/New_York";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function etParts(d: Date): {
  y: number;
  m: number;
  day: number;
  h: number;
  min: number;
  sec: number;
} {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = f.formatToParts(d);
  const get = (ty: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === ty)?.value ?? "0";
  return {
    y: parseInt(get("year"), 10),
    m: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    h: parseInt(get("hour"), 10),
    min: parseInt(get("minute"), 10),
    sec: parseInt(get("second"), 10),
  };
}

function etWeekdayJs(d: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[s] ?? 0;
}

/** Gregorian Easter Sunday → { month 3|4, day } (anonymous Gregorian algorithm) */
function easterSundayMonthDay(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function goodFridayIso(year: number): string {
  const e = easterSundayMonthDay(year);
  const easterUtc = Date.UTC(year, e.month - 1, e.day);
  const gf = new Date(easterUtc - 2 * 86_400_000);
  return `${gf.getUTCFullYear()}-${pad2(gf.getUTCMonth() + 1)}-${pad2(gf.getUTCDate())}`;
}

function ymdToIso(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addCalendarDays(y: number, m: number, d: number, delta: number): {
  y: number;
  m: number;
  d: number;
} {
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Nth weekday in month (weekday: 0 Sun … 6 Sat), month 1–12 */
function nthWeekdayOfMonthEt(
  year: number,
  month: number,
  weekday: number,
  n: number
): { y: number; m: number; d: number } {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    let ms: number;
    try {
      ms = findMillisForEtHm(year, month, d, 12, 0);
    } catch {
      continue;
    }
    const ep = etParts(new Date(ms));
    if (ep.y !== year || ep.m !== month || ep.day !== d) continue;
    if (etWeekdayJs(new Date(ms)) === weekday) {
      count++;
      if (count === n) return { y: year, m: month, d };
    }
  }
  throw new Error(`nth weekday not found ${year}-${month}`);
}

function lastWeekdayOfMonthEt(
  year: number,
  month: number,
  weekday: number
): { y: number; m: number; d: number } {
  for (let d = 31; d >= 1; d--) {
    let ms: number;
    try {
      ms = findMillisForEtHm(year, month, d, 12, 0);
    } catch {
      continue;
    }
    const ep = etParts(new Date(ms));
    if (ep.y !== year || ep.m !== month || ep.day !== d) continue;
    if (etWeekdayJs(new Date(ms)) === weekday) return { y: year, m: month, d };
  }
  throw new Error(`last weekday not found ${year}-${month}`);
}

function observedForCalendarDate(
  y: number,
  m: number,
  d: number
): { y: number; m: number; d: number } {
  const ms = findMillisForEtHm(y, m, d, 12, 0);
  const wd = etWeekdayJs(new Date(ms));
  if (wd === 6) return addCalendarDays(y, m, d, -1);
  if (wd === 0) return addCalendarDays(y, m, d, 1);
  return { y, m, d };
}

function newYearMarketClose(y: number): string {
  const wd = (() => {
    const ms = findMillisForEtHm(y, 1, 1, 12, 0);
    return etWeekdayJs(new Date(ms));
  })();
  if (wd === 6) return ymdToIso(y - 1, 12, 31);
  if (wd === 0) return ymdToIso(y, 1, 2);
  return ymdToIso(y, 1, 1);
}

function buildNyseClosedDates(fromYear: number, toYear: number): Set<string> {
  const s = new Set<string>();
  for (let y = fromYear; y <= toYear; y++) {
    s.add(goodFridayIso(y));
    s.add(newYearMarketClose(y));

    const mlk = nthWeekdayOfMonthEt(y, 1, 1, 3);
    s.add(ymdToIso(mlk.y, mlk.m, mlk.d));

    const pres = nthWeekdayOfMonthEt(y, 2, 1, 3);
    s.add(ymdToIso(pres.y, pres.m, pres.d));

    const mem = lastWeekdayOfMonthEt(y, 5, 1);
    s.add(ymdToIso(mem.y, mem.m, mem.d));

    const jun = observedForCalendarDate(y, 6, 19);
    s.add(ymdToIso(jun.y, jun.m, jun.d));

    const j4 = observedForCalendarDate(y, 7, 4);
    s.add(ymdToIso(j4.y, j4.m, j4.d));

    const labor = nthWeekdayOfMonthEt(y, 9, 1, 1);
    s.add(ymdToIso(labor.y, labor.m, labor.d));

    const thx = nthWeekdayOfMonthEt(y, 11, 4, 4);
    s.add(ymdToIso(thx.y, thx.m, thx.d));

    const xm = observedForCalendarDate(y, 12, 25);
    s.add(ymdToIso(xm.y, xm.m, xm.d));
  }
  return s;
}

const NYSE_CLOSED = buildNyseClosedDates(2023, 2036);

function isTradingDayYmd(y: number, m: number, d: number): boolean {
  const ms = findMillisForEtHm(y, m, d, 12, 0);
  const wd = etWeekdayJs(new Date(ms));
  if (wd === 0 || wd === 6) return false;
  return !NYSE_CLOSED.has(ymdToIso(y, m, d));
}

function findMillisForEtHm(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number
): number {
  const dayStart = Date.UTC(y, m - 1, d, 0, 0, 0);
  for (let i = 0; i < 24 * 60; i++) {
    const t = dayStart + i * 60_000;
    const p = etParts(new Date(t));
    if (
      p.y === y &&
      p.m === m &&
      p.day === d &&
      p.h === hour &&
      p.min === minute
    ) {
      return t;
    }
  }
  throw new Error(`No ET time ${hour}:${minute} on ${y}-${m}-${d}`);
}

function formatDurationShort(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const rm = totalMin % 60;
  if (h < 48) return rm === 0 ? `${h}h` : `${h}h ${rm}m`;
  const days = Math.floor(h / 24);
  const rh = h % 24;
  return rh === 0 ? `${days}d` : `${days}d ${rh}h`;
}

export type UsMarketSessionStatus = "regular" | "pre" | "post" | "closed";

export type UsMarketSessionInfo = {
  status: UsMarketSessionStatus;
  /** green / amber / muted */
  dot: "green" | "amber" | "muted";
  headline: string;
  subline: string;
  ariaLabel: string;
  /** e.g. "Closes 4:00 PM ET" */
  tooltip: string;
};

function nextRegularOpenMillisFrom(
  y: number,
  m: number,
  d: number,
  nowMs: number
): number {
  const tryToday = findMillisForEtHm(y, m, d, 9, 30);
  if (isTradingDayYmd(y, m, d) && nowMs < tryToday) return tryToday;
  let cur = addCalendarDays(y, m, d, 0);
  for (let i = 0; i < 400; i++) {
    cur = addCalendarDays(cur.y, cur.m, cur.d, 1);
    if (isTradingDayYmd(cur.y, cur.m, cur.d)) {
      return findMillisForEtHm(cur.y, cur.m, cur.d, 9, 30);
    }
  }
  throw new Error("No upcoming session");
}

export function getUsMarketSession(nowMs: number = Date.now()): UsMarketSessionInfo {
  const now = new Date(nowMs);
  const p = etParts(now);
  const mins = p.h * 60 + p.min;
  const todayOk = isTradingDayYmd(p.y, p.m, p.day);

  const PRE = 4 * 60;
  const OPEN = 9 * 60 + 30;
  const CLOSE = 16 * 60;
  const POST = 20 * 60;

  const tooltipBase =
    "NYSE/Nasdaq regular hours 9:30 AM – 4:00 PM ET (weekdays; federal holidays & Good Friday).";

  if (todayOk) {
    const tOpen = findMillisForEtHm(p.y, p.m, p.day, 9, 30);
    const tClose = findMillisForEtHm(p.y, p.m, p.day, 16, 0);
    const tPre = findMillisForEtHm(p.y, p.m, p.day, 4, 0);
    const tPostEnd = findMillisForEtHm(p.y, p.m, p.day, 20, 0);

    if (mins >= OPEN && mins < CLOSE) {
      return {
        status: "regular",
        dot: "green",
        headline: "Market open",
        subline: `Closes in ${formatDurationShort(tClose - nowMs)}`,
        ariaLabel: `US stock market regular session is open. Closes in ${formatDurationShort(tClose - nowMs)}.`,
        tooltip: `${tooltipBase} Closes 4:00 PM ET.`,
      };
    }

    if (mins >= PRE && mins < OPEN) {
      return {
        status: "pre",
        dot: "amber",
        headline: "Pre-market",
        subline: `Regular opens in ${formatDurationShort(tOpen - nowMs)}`,
        ariaLabel: `Pre-market session. Regular session opens in ${formatDurationShort(tOpen - nowMs)}.`,
        tooltip: `${tooltipBase} Pre-market shown until 9:30 AM ET.`,
      };
    }

    if (mins >= CLOSE && mins < POST) {
      const nextReg = nextRegularOpenMillisFrom(p.y, p.m, p.day, nowMs);
      return {
        status: "post",
        dot: "amber",
        headline: "After hours",
        subline: `Regular reopens in ${formatDurationShort(nextReg - nowMs)}`,
        ariaLabel: `After-hours session. Regular session reopens in ${formatDurationShort(nextReg - nowMs)}.`,
        tooltip: `${tooltipBase} After-hours reference until 8:00 PM ET.`,
      };
    }
  }

  const nextReg = nextRegularOpenMillisFrom(p.y, p.m, p.day, nowMs);
  const untilPre =
    todayOk && mins < PRE
      ? findMillisForEtHm(p.y, p.m, p.day, 4, 0) - nowMs
      : null;

  if (todayOk && untilPre != null && untilPre > 0) {
    return {
      status: "closed",
      dot: "muted",
      headline: "Market closed",
      subline: `Pre-market in ${formatDurationShort(untilPre)}`,
      ariaLabel: `Market closed. Pre-market starts in ${formatDurationShort(untilPre)}.`,
      tooltip: tooltipBase,
    };
  }

  return {
    status: "closed",
    dot: "muted",
    headline: "Market closed",
    subline: `Opens in ${formatDurationShort(nextReg - nowMs)}`,
    ariaLabel: `US stock market closed. Next regular session opens in ${formatDurationShort(nextReg - nowMs)}.`,
    tooltip: tooltipBase,
  };
}

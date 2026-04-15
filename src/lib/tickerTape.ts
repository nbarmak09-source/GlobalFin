import { prisma } from "./prisma";
import { getAllPositionsForUser } from "./portfolio";
import { DEFAULT_TICKER_SYMBOLS } from "./yahoo";

export const TICKER_TAPE_MAX_SYMBOLS = 10;

export const TICKER_TAPE_MODES = ["default", "portfolio", "custom"] as const;
export type TickerTapeMode = (typeof TICKER_TAPE_MODES)[number];

const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,10}$/;

function normalizeMode(raw: string | null | undefined): TickerTapeMode {
  if (raw === "portfolio" || raw === "custom" || raw === "default") return raw;
  return "default";
}

/** Parse JSON array from DB; trim, uppercase, dedupe, cap at 10. */
export function parseCustomTickerSymbols(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const s = x.trim().toUpperCase();
    if (!SYMBOL_REGEX.test(s)) continue;
    if (out.includes(s)) continue;
    out.push(s);
    if (out.length >= TICKER_TAPE_MAX_SYMBOLS) break;
  }
  return out;
}

export async function resolveTickerSymbolsForUser(
  userId: string | null
): Promise<string[]> {
  if (!userId) {
    return [...DEFAULT_TICKER_SYMBOLS];
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tickerTapeMode: true, tickerTapeSymbols: true },
  });
  if (!user) {
    return [...DEFAULT_TICKER_SYMBOLS];
  }

  const mode = normalizeMode(user.tickerTapeMode);

  if (mode === "default") {
    return [...DEFAULT_TICKER_SYMBOLS];
  }

  if (mode === "portfolio") {
    const positions = await getAllPositionsForUser(userId);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of positions) {
      const s = p.symbol.trim().toUpperCase();
      if (!SYMBOL_REGEX.test(s)) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= TICKER_TAPE_MAX_SYMBOLS) break;
    }
    return out.length > 0 ? out : [...DEFAULT_TICKER_SYMBOLS];
  }

  const custom = parseCustomTickerSymbols(user.tickerTapeSymbols);
  return custom.length > 0 ? custom : [...DEFAULT_TICKER_SYMBOLS];
}

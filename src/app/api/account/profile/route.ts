import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TICKER_TAPE_MAX_SYMBOLS,
  TICKER_TAPE_MODES,
  type TickerTapeMode,
  parseCustomTickerSymbols,
} from "@/lib/tickerTape";

function isTickerTapeMode(v: unknown): v is TickerTapeMode {
  return typeof v === "string" && (TICKER_TAPE_MODES as readonly string[]).includes(v);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const [user, accounts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          bio: true,
          createdAt: true,
          tickerTapeMode: true,
          tickerTapeSymbols: true,
          priceAlertEmails: true,
        },
      }),
      prisma.account.findMany({
        where: { userId },
        select: { provider: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const customSyms = parseCustomTickerSymbols(user.tickerTapeSymbols);

    return NextResponse.json({
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      bio: user.bio,
      createdAt: user.createdAt,
      providers: accounts.map((a) => a.provider),
      tickerTapeMode: (isTickerTapeMode(user.tickerTapeMode)
        ? user.tickerTapeMode
        : "default") as TickerTapeMode,
      tickerTapeSymbols: customSyms,
      priceAlertEmails: user.priceAlertEmails,
    });
  } catch (e) {
    console.error("GET /api/account/profile:", e);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      bio?: unknown;
      tickerTapeMode?: unknown;
      tickerTapeSymbols?: unknown;
      priceAlertEmails?: unknown;
    } | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const nameRaw = body.name;
    const bioRaw = body.bio;
    const tickerTapeModeRaw = body.tickerTapeMode;
    const tickerTapeSymbolsRaw = body.tickerTapeSymbols;
    const priceAlertEmailsRaw = body.priceAlertEmails;

    if (nameRaw !== undefined) {
      if (typeof nameRaw !== "string") {
        return NextResponse.json({ error: "name must be a string" }, { status: 400 });
      }
      const len = nameRaw.trim().length;
      if (len < 1 || len > 100) {
        return NextResponse.json(
          { error: "name must be between 1 and 100 characters" },
          { status: 400 }
        );
      }
    }

    if (bioRaw !== undefined && bioRaw !== null) {
      if (typeof bioRaw !== "string") {
        return NextResponse.json({ error: "bio must be a string" }, { status: 400 });
      }
      if (bioRaw.length > 200) {
        return NextResponse.json({ error: "bio must be at most 200 characters" }, { status: 400 });
      }
    }

    if (tickerTapeModeRaw !== undefined && !isTickerTapeMode(tickerTapeModeRaw)) {
      return NextResponse.json(
        { error: "tickerTapeMode must be default, portfolio, or custom" },
        { status: 400 }
      );
    }

    if (tickerTapeSymbolsRaw !== undefined && !Array.isArray(tickerTapeSymbolsRaw)) {
      return NextResponse.json(
        { error: "tickerTapeSymbols must be an array of strings" },
        { status: 400 }
      );
    }

    if (
      priceAlertEmailsRaw !== undefined &&
      typeof priceAlertEmailsRaw !== "boolean"
    ) {
      return NextResponse.json(
        { error: "priceAlertEmails must be a boolean" },
        { status: 400 }
      );
    }

    const hasTickerPatch =
      tickerTapeModeRaw !== undefined || tickerTapeSymbolsRaw !== undefined;

    let existingTicker: { tickerTapeMode: string | null; tickerTapeSymbols: unknown } | null =
      null;
    if (hasTickerPatch) {
      existingTicker = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { tickerTapeMode: true, tickerTapeSymbols: true },
      });
    }

    const data: Prisma.UserUpdateInput = {};
    if (nameRaw !== undefined) data.name = (nameRaw as string).trim();
    if (bioRaw !== undefined) data.bio = bioRaw === null ? null : (bioRaw as string);
    if (priceAlertEmailsRaw !== undefined) {
      data.priceAlertEmails = priceAlertEmailsRaw as boolean;
    }

    if (tickerTapeModeRaw !== undefined) {
      data.tickerTapeMode = tickerTapeModeRaw;
    }

    if (tickerTapeSymbolsRaw !== undefined) {
      const parsed = parseCustomTickerSymbols(tickerTapeSymbolsRaw);
      if (parsed.length === 0) {
        return NextResponse.json(
          { error: `Add 1–${TICKER_TAPE_MAX_SYMBOLS} ticker symbols for custom tape` },
          { status: 400 }
        );
      }
      data.tickerTapeSymbols = parsed;
      if (tickerTapeModeRaw === undefined) {
        data.tickerTapeMode = "custom";
      }
    }

    if (hasTickerPatch) {
      const nextMode: TickerTapeMode =
        data.tickerTapeMode !== undefined && isTickerTapeMode(data.tickerTapeMode)
          ? data.tickerTapeMode
          : isTickerTapeMode(existingTicker?.tickerTapeMode)
            ? existingTicker!.tickerTapeMode
            : "default";
      const nextSyms =
        data.tickerTapeSymbols !== undefined
          ? parseCustomTickerSymbols(data.tickerTapeSymbols)
          : parseCustomTickerSymbols(existingTicker?.tickerTapeSymbols);
      if (nextMode === "custom" && nextSyms.length === 0) {
        return NextResponse.json(
          { error: `Add 1–${TICKER_TAPE_MAX_SYMBOLS} ticker symbols for custom tape` },
          { status: 400 }
        );
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        bio: true,
        createdAt: true,
        tickerTapeMode: true,
        tickerTapeSymbols: true,
        priceAlertEmails: true,
      },
    });

    const customSyms = parseCustomTickerSymbols(updated.tickerTapeSymbols);

    return NextResponse.json({
      ...updated,
      tickerTapeMode: (isTickerTapeMode(updated.tickerTapeMode)
        ? updated.tickerTapeMode
        : "default") as TickerTapeMode,
      tickerTapeSymbols: customSyms,
      priceAlertEmails: updated.priceAlertEmails,
    });
  } catch (e) {
    console.error("PATCH /api/account/profile:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

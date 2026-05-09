import { NextRequest, NextResponse } from "next/server";
import {
  ensureDefaultWatchlistGroup,
  getWatchlistGroups,
  createWatchlistGroup,
} from "@/lib/portfolio";
import { auth } from "@/lib/auth";
import { databaseUserMessage } from "@/lib/db-error-message";

function jsonFromDbCatch(
  logLabel: string,
  error: unknown,
  fallback: string,
  statusFallback = 500
) {
  console.error(logLabel, error);
  const msg = databaseUserMessage(error);
  if (msg) {
    return NextResponse.json({ error: msg }, { status: 503 });
  }
  return NextResponse.json({ error: fallback }, { status: statusFallback });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDefaultWatchlistGroup(session.user.id);
    const groups = await getWatchlistGroups(session.user.id);
    return NextResponse.json(groups);
  } catch (error) {
    return jsonFromDbCatch(
      "Watchlist groups GET error:",
      error,
      "Failed to fetch watchlist groups.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { name } = body as Record<string, unknown>;
    const raw =
      typeof name === "string" ? name : name == null ? "" : "";

    const group = await createWatchlistGroup(session.user.id, raw);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return jsonFromDbCatch(
      "Watchlist groups POST error:",
      error,
      "Failed to create watchlist group.",
      500
    );
  }
}

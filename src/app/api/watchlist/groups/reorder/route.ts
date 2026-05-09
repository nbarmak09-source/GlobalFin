import { NextRequest, NextResponse } from "next/server";
import { reorderWatchlistGroups } from "@/lib/portfolio";
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
    const { orderedIds } = body as Record<string, unknown>;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds array is required" },
        { status: 400 }
      );
    }
    if (
      orderedIds.some(
        (x: unknown) => typeof x !== "string" || (x as string).trim().length === 0
      )
    ) {
      return NextResponse.json(
        { error: "orderedIds must be non-empty strings" },
        { status: 400 }
      );
    }

    await reorderWatchlistGroups(
      session.user.id,
      orderedIds as string[]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonFromDbCatch(
      "Watchlist groups reorder POST error:",
      error,
      "Failed to reorder watchlist groups.",
      500
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  deleteWatchlistGroup,
  renameWatchlistGroup,
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

type RouteCtx = {
  params: Promise<{ groupId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await context.params;
    const id = groupId?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing group id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { name } = body as Record<string, unknown>;
    if (typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const updated = await renameWatchlistGroup(
      session.user.id,
      id,
      name
    );
    if (!updated) {
      return NextResponse.json({ error: "Watchlist group not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return jsonFromDbCatch(
      "Watchlist group PATCH error:",
      error,
      "Failed to rename watchlist group.",
      500
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await context.params;
    const id = groupId?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing group id" }, { status: 400 });
    }

    const ok = await deleteWatchlistGroup(session.user.id, id);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            "Cannot delete watchlist group (not found or it is your only list)",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonFromDbCatch(
      "Watchlist group DELETE error:",
      error,
      "Failed to delete watchlist group.",
      500
    );
  }
}

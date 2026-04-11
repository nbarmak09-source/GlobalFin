import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [pitchCount, watchlistCount, positionCount, alertCount] = await Promise.all([
      prisma.pitch.count({ where: { userId } }),
      prisma.watchlistItem.count({ where: { userId } }),
      prisma.position.count({ where: { userId } }),
      prisma.alert.count({ where: { userId, triggered: false } }),
    ]);

    return NextResponse.json({
      pitchCount,
      watchlistCount,
      positionCount,
      alertCount,
    });
  } catch (e) {
    console.error("GET /api/account/stats:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

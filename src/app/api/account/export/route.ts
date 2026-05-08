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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        tickerTapeMode: true,
        tickerTapeSymbols: true,
      },
    });

    const [positions, watchlist, pitches, alerts] = await Promise.all([
      prisma.position.findMany({ where: { userId } }),
      prisma.watchlistItem.findMany({ where: { userId } }),
      prisma.pitch.findMany({ where: { userId } }),
      prisma.alert.findMany({ where: { userId } }),
    ]);

    const exportedAt = new Date().toISOString();
    const body = JSON.stringify(
      {
        exportedAt,
        user: {
          name: user?.name ?? null,
          email: user?.email ?? null,
          tickerTapeMode: user?.tickerTapeMode ?? null,
          tickerTapeSymbols: user?.tickerTapeSymbols ?? null,
        },
        positions,
        watchlist,
        pitches,
        alerts,
      },
      null,
      2
    );

    const dateStr = new Date().toISOString().split("T")[0];
    const res = new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="capital-markets-hub-export-${dateStr}.json"`,
      },
    });
    return res;
  } catch (e) {
    console.error("GET /api/account/export:", e);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processPendingPriceAlerts } from "@/lib/priceAlertJobs";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processPendingPriceAlerts(
      { userId: session.user.id },
      { sendEmail: true },
    );

    return NextResponse.json({
      updated: result.newlyTriggered,
      total: result.scanned,
      emailsSent: result.emailsSent,
      emailFailures: result.emailFailures,
    });
  } catch (error) {
    console.error("Alerts CHECK error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate alerts" },
      { status: 500 },
    );
  }
}

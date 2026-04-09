import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DB_CHECK_TIMEOUT_MS = 400;

export async function GET() {
  const timestamp = new Date().toISOString();

  const dbCheck = prisma.$queryRaw`SELECT 1`;
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("db_timeout")), DB_CHECK_TIMEOUT_MS);
  });

  try {
    await Promise.race([dbCheck, timeout]);
    return NextResponse.json({ status: "ok", timestamp }, { status: 200 });
  } catch {
    return NextResponse.json(
      { status: "degraded", db: "unreachable", timestamp },
      { status: 503 }
    );
  }
}

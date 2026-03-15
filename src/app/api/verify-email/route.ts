import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || typeof token !== "string") {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });
    if (!record || new Date() > record.expires) {
      return NextResponse.redirect(new URL("/login?error=expired_or_invalid", request.url));
    }

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({
        where: { token: record.token },
      }),
    ]);
  } catch (e) {
    console.error("Verify email error:", e);
    return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
  }

  return NextResponse.redirect(new URL("/login?verified=1", request.url));
}

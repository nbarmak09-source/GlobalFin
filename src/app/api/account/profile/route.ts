import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      bio: user.bio,
      createdAt: user.createdAt,
      providers: accounts.map((a) => a.provider),
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
    } | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const nameRaw = body.name;
    const bioRaw = body.bio;

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

    const data: { name?: string; bio?: string | null } = {};
    if (nameRaw !== undefined) data.name = (nameRaw as string).trim();
    if (bioRaw !== undefined) data.bio = bioRaw === null ? null : (bioRaw as string);

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
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/account/profile:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

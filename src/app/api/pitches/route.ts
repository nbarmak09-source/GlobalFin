import { NextRequest, NextResponse } from "next/server";
import { getPitches, getPitch, savePitch, deletePitch } from "@/lib/pitches";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const pitch = await getPitch(session.user.id, id);
      if (!pitch) {
        return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
      }
      return NextResponse.json(pitch);
    }

    const pitches = await getPitches(session.user.id);
    return NextResponse.json(pitches);
  } catch (error) {
    console.error("Pitches GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pitches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pitch = await request.json();

    if (!pitch.id || !pitch.symbol) {
      return NextResponse.json(
        { error: "id and symbol are required" },
        { status: 400 }
      );
    }

    const saved = await savePitch(session.user.id, pitch);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Pitches POST error:", error);
    return NextResponse.json(
      { error: "Failed to save pitch" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const remaining = await deletePitch(session.user.id, id);
    return NextResponse.json(remaining);
  } catch (error) {
    console.error("Pitches DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete pitch" },
      { status: 500 }
    );
  }
}

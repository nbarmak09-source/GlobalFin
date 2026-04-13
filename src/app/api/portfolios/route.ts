import { NextRequest, NextResponse } from "next/server";
import {
  ensureDefaultPortfolio,
  getPortfolios,
  createPortfolio,
  updatePortfolio,
  reorderPortfolios,
  deletePortfolio,
} from "@/lib/portfolio";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDefaultPortfolio(session.user.id);
    const portfolios = await getPortfolios(session.user.id);
    return NextResponse.json(portfolios);
  } catch (error) {
    console.error("Portfolios GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
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

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { name, description } = body as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const portfolio = await createPortfolio(session.user.id, {
      name,
      description:
        typeof description === "string" ? description : undefined,
    });
    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error("Portfolios POST error:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { id, name, description, orderedIds } = body as Record<
      string,
      unknown
    >;

    if (Array.isArray(orderedIds)) {
      if (
        orderedIds.some(
          (x) => typeof x !== "string" || (x as string).trim().length === 0
        )
      ) {
        return NextResponse.json(
          { error: "orderedIds must be non-empty strings" },
          { status: 400 }
        );
      }
      await reorderPortfolios(
        session.user.id,
        orderedIds as string[]
      );
      return NextResponse.json({ success: true });
    }

    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        { error: "id is required for update" },
        { status: 400 }
      );
    }

    const updated = await updatePortfolio(session.user.id, id.trim(), {
      ...(typeof name === "string" && { name }),
      ...(description !== undefined && {
        description:
          description === null || typeof description === "string"
            ? description
            : undefined,
      }),
    });
    if (!updated) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Portfolios PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio" },
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
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const ok = await deletePortfolio(session.user.id, id.trim());
    if (!ok) {
      return NextResponse.json(
        {
          error:
            "Cannot delete portfolio (not found or it is your only portfolio)",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portfolios DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete portfolio" },
      { status: 500 }
    );
  }
}

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await prisma.user.delete({ where: { id: userId } });

  return signOut({ redirectTo: "/login?deleted=1" });
}

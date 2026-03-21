import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ favouriteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { favouriteId } = await params;
  const favourite = await prisma.favourite.findFirst({
    where: {
      id: favouriteId,
      userId: session.user.id
    }
  });

  if (!favourite) {
    return NextResponse.json({ error: "Favourite not found" }, { status: 404 });
  }

  await prisma.favourite.delete({
    where: { id: favourite.id }
  });

  return NextResponse.json({ success: true });
}

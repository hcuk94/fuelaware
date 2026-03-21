import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ favouriteId: string; alertId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { favouriteId, alertId } = await params;
  const alert = await prisma.alertRule.findFirst({
    where: {
      id: alertId,
      favouriteId,
      favourite: {
        userId: session.user.id
      }
    }
  });

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  await prisma.alertRule.delete({
    where: { id: alert.id }
  });

  return NextResponse.json({ success: true });
}

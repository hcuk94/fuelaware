import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ favouriteId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { favouriteId } = await params;
  const favourite = await prisma.favourite.findFirst({
    where: { id: favouriteId, userId: session.user.id }
  });

  if (!favourite) {
    return NextResponse.json({ error: "Favourite not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    fuelProductId?: string;
    thresholdPrice?: string;
    lowestLookbackDays?: number;
  };

  const alert = await prisma.alertRule.create({
    data: {
      favouriteId,
      fuelProductId: body.fuelProductId,
      thresholdPrice: body.thresholdPrice ? new Prisma.Decimal(body.thresholdPrice) : null,
      lowestLookbackDays: body.lowestLookbackDays ?? null
    }
  });

  return NextResponse.json({ alert });
}

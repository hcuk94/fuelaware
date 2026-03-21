import Decimal from "decimal.js";
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

  if (!body.fuelProductId) {
    return NextResponse.json({ error: "fuelProductId is required" }, { status: 400 });
  }

  const fuelProduct = await prisma.fuelProduct.findFirst({
    where: {
      id: body.fuelProductId,
      stationId: favourite.stationId
    }
  });

  if (!fuelProduct) {
    return NextResponse.json({ error: "Fuel product not found for this favourite" }, { status: 400 });
  }

  const thresholdPrice = body.thresholdPrice?.trim() ? new Decimal(body.thresholdPrice.trim()) : null;
  const lowestLookbackDays = body.lowestLookbackDays ?? null;

  if (thresholdPrice == null && lowestLookbackDays == null) {
    return NextResponse.json({ error: "An alert condition is required" }, { status: 400 });
  }

  const existingAlert = await prisma.alertRule.findFirst({
    where: {
      favouriteId,
      fuelProductId: fuelProduct.id,
      thresholdPrice: thresholdPrice?.toString() ?? null,
      lowestLookbackDays
    }
  });

  if (existingAlert) {
    return NextResponse.json({ alert: existingAlert, duplicate: true });
  }

  const alert = await prisma.alertRule.create({
    data: {
      favouriteId,
      fuelProductId: fuelProduct.id,
      thresholdPrice,
      lowestLookbackDays
    }
  });

  return NextResponse.json({ alert });
}

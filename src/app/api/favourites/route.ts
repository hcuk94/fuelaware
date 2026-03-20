import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { stationId?: string };
  if (!body.stationId) {
    return NextResponse.json({ error: "stationId is required" }, { status: 400 });
  }

  const settings = await getSettings();
  const station = await prisma.station.findFirst({
    where: {
      id: body.stationId,
      sourceKey: {
        in: settings.enabledProviderKeys
      }
    }
  });

  if (!station) {
    return NextResponse.json({ error: "Station unavailable" }, { status: 404 });
  }

  const favourite = await prisma.favourite.upsert({
    where: {
      userId_stationId: {
        userId: session.user.id,
        stationId: body.stationId
      }
    },
    update: {},
    create: {
      userId: session.user.id,
      stationId: body.stationId
    }
  });

  return NextResponse.json({ favourite });
}

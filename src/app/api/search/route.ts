import { NextRequest, NextResponse } from "next/server";
import { searchStations } from "@/lib/services/search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");

  const stations = await searchStations({
    q,
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined
  });

  return NextResponse.json({ stations });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ingestLatestSnapshots } from "@/lib/services/ingest";
import { getSettings } from "@/lib/services/settings";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getSettings();
  if (!settings.allowManualSync) {
    return NextResponse.json({ error: "Manual sync disabled" }, { status: 403 });
  }

  const summary = await ingestLatestSnapshots();
  return NextResponse.json({ summary });
}

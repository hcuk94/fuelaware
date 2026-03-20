import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualSyncState, startManualSync } from "@/lib/services/manual-sync";
import { getSettings } from "@/lib/services/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await getSettings();
  const state = await getManualSyncState();
  return NextResponse.json(state);
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getSettings();
  if (!settings.allowManualSync) {
    return NextResponse.json({ error: "Manual sync disabled" }, { status: 403 });
  }

  const state = await startManualSync();
  return NextResponse.json(state, { status: state.status === "RUNNING" ? 202 : 200 });
}

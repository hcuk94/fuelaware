import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings, normalizeEnabledProviderKeys } from "@/lib/services/settings";

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    registrationEnabled?: boolean;
    allowManualSync?: boolean;
    adminEmail?: string;
    enabledProviderKeys?: unknown;
  };

  const currentSettings = await getSettings();
  const adminEmail = normalizeEmail(body.adminEmail);
  const enabledProviderKeys = normalizeEnabledProviderKeys(body.enabledProviderKeys);

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      registrationEnabled: body.registrationEnabled ?? currentSettings.registrationEnabled,
      allowManualSync: body.allowManualSync ?? currentSettings.allowManualSync,
      adminEmail,
      enabledProviderKeys
    },
    create: {
      id: "singleton",
      registrationEnabled: body.registrationEnabled ?? currentSettings.registrationEnabled,
      allowManualSync: body.allowManualSync ?? currentSettings.allowManualSync,
      adminEmail,
      enabledProviderKeys
    }
  });

  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        email: adminEmail,
        role: "ADMIN",
        emailVerified: new Date()
      }
    });
  }

  return NextResponse.json({
    settings: {
      ...settings,
      enabledProviderKeys
    }
  });
}

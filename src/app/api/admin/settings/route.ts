import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    registrationEnabled?: boolean;
    allowManualSync?: boolean;
    adminEmail?: string;
  };

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      registrationEnabled: body.registrationEnabled ?? true,
      allowManualSync: body.allowManualSync ?? true,
      adminEmail: body.adminEmail
    },
    create: {
      id: "singleton",
      registrationEnabled: body.registrationEnabled ?? true,
      allowManualSync: body.allowManualSync ?? true,
      adminEmail: body.adminEmail
    }
  });

  return NextResponse.json({ settings });
}

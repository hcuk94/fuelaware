import { prisma } from "@/lib/prisma";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase();
}

export async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      registrationEnabled: (process.env.REGISTRATION_ENABLED ?? "true") === "true",
      allowManualSync: true,
      adminEmail: normalizeEmail(process.env.ADMIN_EMAIL)
    }
  });
}

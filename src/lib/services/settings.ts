import { prisma } from "@/lib/prisma";

export async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      registrationEnabled: (process.env.REGISTRATION_ENABLED ?? "true") === "true",
      allowManualSync: true,
      adminEmail: process.env.ADMIN_EMAIL
    }
  });
}

import Decimal from "decimal.js";
import { providerCatalog } from "../src/lib/data-sources";
import { ingestLatestSnapshots } from "../src/lib/services/ingest";
import { createPrismaClient } from "../src/lib/prisma-client";

const prisma = createPrismaClient();

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase();
}

async function main() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "admin@example.com");

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL must be a non-empty email address.");
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      adminEmail,
      registrationEnabled: (process.env.REGISTRATION_ENABLED ?? "true") === "true",
      enabledProviderKeys: providerCatalog.map((provider) => provider.key)
    },
    create: {
      id: "singleton",
      adminEmail,
      registrationEnabled: (process.env.REGISTRATION_ENABLED ?? "true") === "true",
      allowManualSync: true,
      enabledProviderKeys: providerCatalog.map((provider) => provider.key)
    }
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      role: "ADMIN",
      emailVerified: new Date()
    }
  });

  const count = await prisma.station.count();
  if (count === 0) {
    await ingestLatestSnapshots(prisma);
  }

  const firstUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  const firstStation = await prisma.station.findFirst({ include: { products: true } });

  if (firstUser && firstStation) {
    const favourite = await prisma.favourite.upsert({
      where: {
        userId_stationId: {
          userId: firstUser.id,
          stationId: firstStation.id
        }
      },
      update: {},
      create: {
        userId: firstUser.id,
        stationId: firstStation.id,
        nickname: "Seeded favourite"
      }
    });

    const firstProduct = firstStation.products[0];
    if (firstProduct) {
      const existingAlerts = await prisma.alertRule.count({
        where: {
          favouriteId: favourite.id,
          fuelProductId: firstProduct.id
        }
      });

      if (existingAlerts === 0) {
        await prisma.alertRule.createMany({
          data: [
            {
              favouriteId: favourite.id,
              fuelProductId: firstProduct.id,
              thresholdPrice: new Decimal("1.60")
            },
            {
              favouriteId: favourite.id,
              fuelProductId: firstProduct.id,
              lowestLookbackDays: 30
            }
          ]
        });
      }
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

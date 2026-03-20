import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { formatPrice } from "@/lib/utils/format";

type AlertSnapshot = {
  observedAt: Date;
  price: unknown;
};

type AlertUser = {
  email: string | null;
};

type AlertFavourite = {
  user: AlertUser;
};

type ProductAlert = {
  id: string;
  isEnabled: boolean;
  thresholdPrice: unknown;
  lowestLookbackDays: number | null;
  favourite: AlertFavourite;
};

type AlertStation = {
  name: string;
  addressLine1: string | null;
  city: string | null;
};

type AlertProduct = {
  id: string;
  displayName: string;
  currency: string;
  unit: string;
  lastPrice: unknown;
  station: AlertStation;
  alerts: ProductAlert[];
  snapshots: AlertSnapshot[];
};

function buildTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: (process.env.SMTP_SECURE ?? "false") === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
    });
  }

  return nodemailer.createTransport({
    jsonTransport: true
  });
}

async function sendAlertEmail(to: string, subject: string, text: string) {
  const transport = buildTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "FuelAware <no-reply@example.com>",
    to,
    subject,
    text
  });
}

export async function evaluateAlertsForProduct(prisma: PrismaClient, fuelProductId: string) {
  const product = await prisma.fuelProduct.findUnique({
    where: { id: fuelProductId },
    include: {
      station: true,
      alerts: {
        include: {
          favourite: {
            include: {
              user: true
            }
          }
        }
      },
      snapshots: {
        orderBy: { observedAt: "desc" },
        take: 90
      }
    }
  });

  if (!product) return;

  const typedProduct = product as AlertProduct;

  const currentPrice = Number(typedProduct.lastPrice);

  for (const alert of typedProduct.alerts) {
    if (!alert.isEnabled) continue;
    const email = alert.favourite.user.email;
    if (!email) continue;

    let shouldTrigger = false;
    let reason = "";

    if (alert.thresholdPrice != null && currentPrice <= Number(alert.thresholdPrice)) {
      shouldTrigger = true;
      reason = `Price dropped below your threshold: ${formatPrice(currentPrice, typedProduct.currency, typedProduct.unit)}`;
    }

    if (!shouldTrigger && alert.lowestLookbackDays != null) {
      const cutoff = Date.now() - alert.lowestLookbackDays * 24 * 60 * 60 * 1000;
      const relevant = typedProduct.snapshots.filter(
        (snapshot: AlertSnapshot) => snapshot.observedAt.getTime() >= cutoff
      );
      const minimum = Math.min(...relevant.map((snapshot: AlertSnapshot) => Number(snapshot.price)));
      if (relevant.length > 0 && currentPrice <= minimum) {
        shouldTrigger = true;
        reason = `Price is at a ${alert.lowestLookbackDays}-day low: ${formatPrice(currentPrice, typedProduct.currency, typedProduct.unit)}`;
      }
    }

    if (!shouldTrigger) continue;

    await sendAlertEmail(
      email,
      `FuelAware alert for ${typedProduct.station.name}`,
      `${reason}\n\n${typedProduct.displayName} at ${typedProduct.station.name}\n${typedProduct.station.addressLine1 ?? ""}\n${typedProduct.station.city ?? ""}`
    );

    await prisma.alertRule.update({
      where: { id: alert.id },
      data: { lastTriggeredAt: new Date() }
    });
  }
}

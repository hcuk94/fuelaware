import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { formatPrice } from "@/lib/utils/format";

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

  const currentPrice = Number(product.lastPrice);

  for (const alert of product.alerts) {
    if (!alert.isEnabled) continue;
    const email = alert.favourite.user.email;
    if (!email) continue;

    let shouldTrigger = false;
    let reason = "";

    if (alert.thresholdPrice != null && currentPrice <= Number(alert.thresholdPrice)) {
      shouldTrigger = true;
      reason = `Price dropped below your threshold: ${formatPrice(currentPrice, product.currency, product.unit)}`;
    }

    if (!shouldTrigger && alert.lowestLookbackDays != null) {
      const cutoff = Date.now() - alert.lowestLookbackDays * 24 * 60 * 60 * 1000;
      const relevant = product.snapshots.filter((snapshot) => snapshot.observedAt.getTime() >= cutoff);
      const minimum = Math.min(...relevant.map((snapshot) => Number(snapshot.price)));
      if (relevant.length > 0 && currentPrice <= minimum) {
        shouldTrigger = true;
        reason = `Price is at a ${alert.lowestLookbackDays}-day low: ${formatPrice(currentPrice, product.currency, product.unit)}`;
      }
    }

    if (!shouldTrigger) continue;

    await sendAlertEmail(
      email,
      `FuelAware alert for ${product.station.name}`,
      `${reason}\n\n${product.displayName} at ${product.station.name}\n${product.station.addressLine1 ?? ""}\n${product.station.city ?? ""}`
    );

    await prisma.alertRule.update({
      where: { id: alert.id },
      data: { lastTriggeredAt: new Date() }
    });
  }
}

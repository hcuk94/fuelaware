import type { PrismaClient } from "@prisma/client";
import { evaluateAlertsForProduct } from "./alerts";

const sendMail = vi.fn();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail
    }))
  }
}));

describe("evaluateAlertsForProduct", () => {
  const prisma = {
    fuelProduct: {
      findUnique: vi.fn()
    },
    alertRule: {
      update: vi.fn()
    }
  } as unknown as PrismaClient;

  afterEach(() => {
    sendMail.mockReset();
    vi.clearAllMocks();
  });

  it("emails users when a threshold alert is met", async () => {
    prisma.fuelProduct.findUnique = vi.fn().mockResolvedValue({
      id: "product-1",
      displayName: "Unleaded E10",
      currency: "GBP",
      unit: "L",
      lastPrice: 1.45,
      station: { name: "Demo Station", addressLine1: "1 Demo Street", city: "London" },
      snapshots: [
        { price: 1.45, observedAt: new Date("2026-03-11T10:00:00Z") },
        { price: 1.52, observedAt: new Date("2026-03-10T10:00:00Z") }
      ],
      alerts: [
        {
          id: "alert-1",
          isEnabled: true,
          thresholdPrice: 1.5,
          lowestLookbackDays: null,
          favourite: { user: { email: "user@example.com" } }
        }
      ]
    });
    prisma.alertRule.update = vi.fn().mockResolvedValue({});

    await evaluateAlertsForProduct(prisma, "product-1");

    expect(sendMail).toHaveBeenCalledOnce();
    expect(prisma.alertRule.update).toHaveBeenCalledWith({
      where: { id: "alert-1" },
      data: { lastTriggeredAt: expect.any(Date) }
    });
  });

  it("emails users when the price reaches a lookback low", async () => {
    prisma.fuelProduct.findUnique = vi.fn().mockResolvedValue({
      id: "product-2",
      displayName: "Gazole",
      currency: "EUR",
      unit: "L",
      lastPrice: 1.42,
      station: { name: "Station Demo", addressLine1: "2 Rue Demo", city: "Paris" },
      snapshots: [
        { price: 1.42, observedAt: new Date("2026-03-20T10:00:00Z") },
        { price: 1.5, observedAt: new Date("2026-03-19T10:00:00Z") },
        { price: 1.42, observedAt: new Date("2026-03-18T10:00:00Z") }
      ],
      alerts: [
        {
          id: "alert-2",
          isEnabled: true,
          thresholdPrice: null,
          lowestLookbackDays: 30,
          favourite: { user: { email: "user@example.com" } }
        }
      ]
    });
    prisma.alertRule.update = vi.fn().mockResolvedValue({});

    await evaluateAlertsForProduct(prisma, "product-2");

    expect(sendMail).toHaveBeenCalledOnce();
  });

  it("does nothing when no alert condition is met", async () => {
    prisma.fuelProduct.findUnique = vi.fn().mockResolvedValue({
      id: "product-3",
      displayName: "Diesel",
      currency: "GBP",
      unit: "L",
      lastPrice: 1.62,
      station: { name: "Station Demo", addressLine1: "3 Demo Road", city: "Leeds" },
      snapshots: [
        { price: 1.62, observedAt: new Date("2026-03-20T10:00:00Z") },
        { price: 1.5, observedAt: new Date("2026-03-19T10:00:00Z") },
        { price: 1.45, observedAt: new Date("2026-03-18T10:00:00Z") }
      ],
      alerts: [
        {
          id: "alert-3",
          isEnabled: true,
          thresholdPrice: 1.4,
          lowestLookbackDays: 30,
          favourite: { user: { email: "user@example.com" } }
        }
      ]
    });
    prisma.alertRule.update = vi.fn().mockResolvedValue({});

    await evaluateAlertsForProduct(prisma, "product-3");

    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.alertRule.update).not.toHaveBeenCalled();
  });

  it("does not email on the first stored snapshot for a newly favourited station", async () => {
    prisma.fuelProduct.findUnique = vi.fn().mockResolvedValue({
      id: "product-4",
      displayName: "Diesel",
      currency: "GBP",
      unit: "L",
      lastPrice: 1.45,
      station: { name: "New Favourite", addressLine1: "4 Demo Road", city: "Bristol" },
      snapshots: [{ price: 1.45, observedAt: new Date("2026-03-20T10:00:00Z") }],
      alerts: [
        {
          id: "alert-4",
          isEnabled: true,
          thresholdPrice: 1.5,
          lowestLookbackDays: 30,
          favourite: { user: { email: "user@example.com" } }
        }
      ]
    });
    prisma.alertRule.update = vi.fn().mockResolvedValue({});

    await evaluateAlertsForProduct(prisma, "product-4");

    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.alertRule.update).not.toHaveBeenCalled();
  });

  it("does not repeat a threshold alert while the price stays below the threshold", async () => {
    prisma.fuelProduct.findUnique = vi.fn().mockResolvedValue({
      id: "product-5",
      displayName: "Diesel",
      currency: "GBP",
      unit: "L",
      lastPrice: 1.45,
      station: { name: "Repeat Station", addressLine1: "5 Demo Road", city: "York" },
      snapshots: [
        { price: 1.45, observedAt: new Date("2026-03-20T10:00:00Z") },
        { price: 1.46, observedAt: new Date("2026-03-19T10:00:00Z") }
      ],
      alerts: [
        {
          id: "alert-5",
          isEnabled: true,
          thresholdPrice: 1.5,
          lowestLookbackDays: null,
          favourite: { user: { email: "user@example.com" } }
        }
      ]
    });
    prisma.alertRule.update = vi.fn().mockResolvedValue({});

    await evaluateAlertsForProduct(prisma, "product-5");

    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.alertRule.update).not.toHaveBeenCalled();
  });
});

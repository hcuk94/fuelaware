import type { PrismaClient } from "@prisma/client";
import type { FuelDataSource } from "@/lib/data-sources/types";

const { evaluateAlertsForProduct } = vi.hoisted(() => ({
  evaluateAlertsForProduct: vi.fn()
}));

vi.mock("./alerts", () => ({
  evaluateAlertsForProduct
}));

import { ingestLatestSnapshots } from "./ingest";

function createSource(): FuelDataSource {
  return {
    key: "test-source",
    label: "Test Source",
    fetchStations: vi.fn().mockResolvedValue([
      {
        sourceKey: "test-source",
        externalId: "station-1",
        name: "Station One",
        type: "STATION",
        countryCode: "GB",
        addressLine1: "1 Test Street",
        city: "London",
        postcode: "N1",
        latitude: 51.5,
        longitude: -0.1,
        brand: "FuelAware",
        operatorName: "FuelAware",
        metadata: { zone: "A" },
        products: [
          {
            productCode: "e10",
            displayName: "Unleaded",
            category: "PETROL",
            unit: "L",
            currency: "GBP",
            price: 1.459,
            observedAt: new Date("2026-03-20T10:00:00Z"),
            metadata: { source: "test" }
          }
        ]
      }
    ])
  };
}

function createPrismaMock(storeStationHistoryForAll: boolean, favouritedStationIds: string[] = []) {
  return {
    appSettings: {
      findUnique: vi.fn().mockResolvedValue({ storeStationHistoryForAll })
    },
    favourite: {
      findMany: vi.fn().mockResolvedValue(favouritedStationIds.map((stationId) => ({ stationId })))
    },
    station: {
      upsert: vi.fn().mockResolvedValue({ id: "stored-station-1" })
    },
    fuelProduct: {
      upsert: vi.fn().mockResolvedValue({ id: "stored-product-1" })
    },
    priceSnapshot: {
      create: vi.fn().mockResolvedValue({})
    }
  } as unknown as PrismaClient;
}

describe("ingestLatestSnapshots", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips snapshot storage for stations that are not favourited when the admin override is off", async () => {
    const prisma = createPrismaMock(false);

    await ingestLatestSnapshots(prisma, { sources: [createSource()] });

    expect(prisma.favourite.findMany).toHaveBeenCalledOnce();
    expect(prisma.priceSnapshot.create).not.toHaveBeenCalled();
    expect(evaluateAlertsForProduct).not.toHaveBeenCalled();
  });

  it("stores snapshots for favourited stations when the admin override is off", async () => {
    const prisma = createPrismaMock(false, ["stored-station-1"]);

    await ingestLatestSnapshots(prisma, { sources: [createSource()] });

    expect(prisma.priceSnapshot.create).toHaveBeenCalledOnce();
    expect(evaluateAlertsForProduct).toHaveBeenCalledWith(prisma, "stored-product-1");
  });

  it("stores snapshots for all stations when the admin override is on", async () => {
    const prisma = createPrismaMock(true);

    await ingestLatestSnapshots(prisma, { sources: [createSource()] });

    expect(prisma.favourite.findMany).not.toHaveBeenCalled();
    expect(prisma.priceSnapshot.create).toHaveBeenCalledOnce();
    expect(evaluateAlertsForProduct).toHaveBeenCalledWith(prisma, "stored-product-1");
  });
});

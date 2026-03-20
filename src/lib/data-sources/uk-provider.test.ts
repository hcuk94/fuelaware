import { FuelCategory } from "@prisma/client";
import { mockStations } from "./mock-data";
import { UkFuelProvider } from "./uk-provider";

describe("UkFuelProvider", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns mock stations when no API URL is configured", async () => {
    process.env = { ...originalEnv, UK_FUEL_API_URL: "" };
    const provider = new UkFuelProvider();

    await expect(provider.fetchStations()).resolves.toEqual(
      mockStations.filter((station) => station.sourceKey === "uk-gov")
    );
  });

  it("normalizes upstream station data", async () => {
    process.env = { ...originalEnv, UK_FUEL_API_URL: "https://example.test/uk" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stations: [
          {
            site_id: "demo-1",
            site_name: "Demo Court",
            brand: "DemoFuel",
            address: "1 Demo Street",
            town: "Leeds",
            postcode: "LS1",
            lat: 53.8,
            lon: -1.54,
            last_updated: "2026-03-20T10:00:00Z",
            prices: {
              e10: 1.52,
              b7: 1.61
            }
          }
        ]
      })
    }) as typeof fetch;

    const provider = new UkFuelProvider();
    const stations = await provider.fetchStations();

    expect(stations).toHaveLength(1);
    expect(stations[0]).toMatchObject({
      sourceKey: "uk-gov",
      externalId: "demo-1",
      city: "Leeds",
      countryCode: "GB"
    });
    expect(stations[0].products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productCode: "e10", category: FuelCategory.PETROL }),
        expect.objectContaining({ productCode: "b7", category: FuelCategory.DIESEL })
      ])
    );
  });
});

import { UkFuelProvider } from "./uk-provider";
import { FuelCategory } from "./types";

describe("UkFuelProvider", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("defaults to the government URL when no API URL is configured", async () => {
    process.env = { ...originalEnv, UK_FUEL_API_URL: "" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            site_id: "default-url-1",
            site_name: "Default URL Court",
            town: "Bristol",
            lat: 51.45,
            lon: -2.58,
            prices: {
              e10: 1.49
            }
          }
        ]
      })
    }) as typeof fetch;
    const provider = new UkFuelProvider();

    await expect(provider.fetchStations()).resolves.toEqual([
      expect.objectContaining({
        externalId: "default-url-1",
        name: "Default URL Court",
        city: "Bristol"
      })
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://www.fuel-finder.service.gov.uk/api/v1/prices",
      expect.objectContaining({
        next: { revalidate: 0 }
      })
    );
  });

  it("normalizes upstream station data", async () => {
    process.env = {
      ...originalEnv,
      UK_FUEL_API_URL: "https://www.fuel-finder.service.gov.uk/api/v1/",
      UK_FUEL_CLIENT_ID: "demo-client",
      UK_FUEL_CLIENT_SECRET: "demo-secret",
      UK_FUEL_TOKEN_URL: "https://www.fuel-finder.service.gov.uk/oauth/token"
    };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-token",
          expires_in: 3600
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
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

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://www.fuel-finder.service.gov.uk/oauth/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:
          "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret&scope=fuelfinder.read"
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://www.fuel-finder.service.gov.uk/api/v1/prices",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer access-token"
        }
      })
    );
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

  it("groups row-based government API records by forecourt", async () => {
    process.env = { ...originalEnv, UK_FUEL_API_URL: "https://example.test/uk" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            forecourt_id: "gb-123",
            fuel_type: "e10",
            price: 1.48,
            observed_at: "2026-03-20T10:00:00Z",
            forecourt: {
              forecourt_id: "gb-123",
              name: "City Forecourt",
              address: "10 High Street",
              city: "York",
              postcode: "YO1 1AA",
              latitude: 53.96,
              longitude: -1.08,
              brand: "Fuel Finder"
            }
          },
          {
            forecourt_id: "gb-123",
            fuel_type: "b7",
            price: 1.56,
            observed_at: "2026-03-20T10:00:00Z",
            forecourt: {
              forecourt_id: "gb-123",
              name: "City Forecourt",
              address: "10 High Street",
              city: "York",
              postcode: "YO1 1AA",
              latitude: 53.96,
              longitude: -1.08,
              brand: "Fuel Finder"
            }
          }
        ]
      })
    }) as typeof fetch;

    const provider = new UkFuelProvider();
    const stations = await provider.fetchStations();

    expect(stations).toHaveLength(1);
    expect(stations[0]).toMatchObject({
      externalId: "gb-123",
      name: "City Forecourt",
      city: "York"
    });
    expect(stations[0].products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productCode: "e10", category: FuelCategory.PETROL }),
        expect.objectContaining({ productCode: "b7", category: FuelCategory.DIESEL })
      ])
    );
  });
});

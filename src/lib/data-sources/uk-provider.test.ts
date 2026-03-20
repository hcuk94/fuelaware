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
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              node_id: "default-url-1",
              trading_name: "Default URL Court",
              city: "Bristol",
              location: {
                postcode: "BS1 4QA",
                latitude: 51.45,
                longitude: -2.58
              }
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              node_id: "default-url-1",
              fuel_prices: [
                {
                  fuel_type: "e10",
                  price: 149.0,
                  price_last_updated: "2026-03-20T10:00:00Z"
                }
              ]
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
      "https://www.fuel-finder.service.gov.uk/api/v1/pfs?batch-number=1",
      expect.objectContaining({
        next: { revalidate: 0 }
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=1",
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
      UK_FUEL_TOKEN_URL: "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token"
    };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            access_token: "access-token",
            expires_in: 3600
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              node_id: "demo-1",
              trading_name: "Demo Court",
              brand_name: "DemoFuel",
              address: "1 Demo Street",
              city: "Leeds",
              location: {
                postcode: "LS1",
                latitude: 53.8,
                longitude: -1.54
              }
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              node_id: "demo-1",
              fuel_prices: [
                {
                  fuel_type: "e10",
                  price: 152.0,
                  price_last_updated: "2026-03-20T10:00:00Z"
                },
                {
                  fuel_type: "b7",
                  price: 161.0,
                  price_last_updated: "2026-03-20T10:00:00Z"
                }
              ]
            }
          ]
        })
      }) as typeof fetch;

    const provider = new UkFuelProvider();
    const stations = await provider.fetchStations();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          client_id: "demo-client",
          client_secret: "demo-secret",
          grant_type: "client_credentials",
          scope: "fuelfinder.read"
        })
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://www.fuel-finder.service.gov.uk/api/v1/pfs?batch-number=1",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer access-token"
        }
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "https://www.fuel-finder.service.gov.uk/api/v1/pfs/fuel-prices?batch-number=1",
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
      countryCode: "GB",
      brand: "DemoFuel"
    });
    expect(stations[0].products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productCode: "e10", category: FuelCategory.PETROL, price: 1.52 }),
        expect.objectContaining({ productCode: "b7", category: FuelCategory.DIESEL, price: 1.61 })
      ])
    );
  });

  it("groups row-based government API records by forecourt", async () => {
    process.env = { ...originalEnv, UK_FUEL_API_URL: "https://example.test/uk" };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              node_id: "gb-123",
              trading_name: "City Forecourt",
              city: "York",
              brand_name: "Fuel Finder",
              location: {
                postcode: "YO1 1AA",
                latitude: 53.96,
                longitude: -1.08
              }
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              node_id: "gb-123",
              fuel_prices: [
                {
                  fuel_type: "e10",
                  price: 148.0,
                  price_last_updated: "2026-03-20T10:00:00Z"
                },
                {
                  fuel_type: "b7",
                  price: 156.0,
                  price_last_updated: "2026-03-20T10:00:00Z"
                }
              ],
              forecourt: {
                node_id: "gb-123",
                trading_name: "City Forecourt",
                city: "York",
                location: {
                  postcode: "YO1 1AA",
                  latitude: 53.96,
                  longitude: -1.08
                },
                brand_name: "Fuel Finder"
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
        expect.objectContaining({ productCode: "e10", category: FuelCategory.PETROL, price: 1.48 }),
        expect.objectContaining({ productCode: "b7", category: FuelCategory.DIESEL, price: 1.56 })
      ])
    );
  });
});

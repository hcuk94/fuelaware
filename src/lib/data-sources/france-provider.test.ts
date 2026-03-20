import { mockStations } from "./mock-data";
import { FranceFuelProvider } from "./france-provider";
import { FuelCategory } from "./types";

describe("FranceFuelProvider", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("normalizes the official-style array payload", async () => {
    process.env = { ...originalEnv, FRANCE_FUEL_API_URL: "https://example.test/fr" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "fr-123",
            adresse: "10 Rue Exemple",
            ville: "Paris",
            code_postal: "75001",
            geom: { lat: 48.86, lon: 2.34 },
            prix: [
              { "@nom": "Gazole", "@valeur": 1.68, "@maj": "2026-03-20T10:00:00Z" },
              { "@nom": "SP95-E10", "@valeur": 1.79, "@maj": "2026-03-20T10:00:00Z" }
            ]
          }
        ]
      })
    }) as typeof fetch;

    const provider = new FranceFuelProvider();
    const stations = await provider.fetchStations();

    expect(stations).toHaveLength(1);
    expect(stations[0]).toMatchObject({
      externalId: "fr-123",
      countryCode: "FR",
      city: "Paris"
    });
    expect(stations[0].products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayName: "Gazole", category: FuelCategory.DIESEL }),
        expect.objectContaining({ displayName: "SP95-E10", category: FuelCategory.PETROL })
      ])
    );
  });

  it("falls back to mock data when the payload shape is unusable", async () => {
    process.env = { ...originalEnv, FRANCE_FUEL_API_URL: "https://example.test/fr" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ id: "bad", geom: { lat: 48.86, lon: 2.34 }, prix: { broken: true } }]
      })
    }) as typeof fetch;

    const provider = new FranceFuelProvider();
    const stations = await provider.fetchStations();

    expect(stations).toEqual(mockStations.filter((station) => station.sourceKey === "fr-open-data"));
  });

  it("normalizes the live API payload when prix is a JSON string", async () => {
    process.env = { ...originalEnv, FRANCE_FUEL_API_URL: "https://example.test/fr" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 35000022,
            adresse: "254, ROUTE DE FOUGERES",
            ville: "Rennes",
            cp: "35000",
            geom: { lat: 48.127, lon: -1.651 },
            prix:
              '[{"@nom":"Gazole","@id":"1","@maj":"2026-03-20 00:01:00","@valeur":"2.090"},{"@nom":"E10","@id":"5","@maj":"2026-03-20 00:01:00","@valeur":"1.939"}]',
            horaires_automate_24_24: "Non",
            services_service: ["Boutique alimentaire", "Lavage automatique"]
          }
        ]
      })
    }) as typeof fetch;

    const provider = new FranceFuelProvider();
    const stations = await provider.fetchStations();

    expect(stations).toHaveLength(1);
    expect(stations[0]).toMatchObject({
      externalId: "35000022",
      city: "Rennes",
      postcode: "35000",
      metadata: {
        automate24h: "Non",
        services: ["Boutique alimentaire", "Lavage automatique"]
      }
    });
    expect(stations[0].products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayName: "Gazole", category: FuelCategory.DIESEL, price: 2.09 }),
        expect.objectContaining({ displayName: "E10", category: FuelCategory.PETROL, price: 1.939 })
      ])
    );
  });

  it("paginates through the France dataset until all pages are fetched", async () => {
    process.env = { ...originalEnv, FRANCE_FUEL_API_URL: "https://example.test/fr?limit=2" };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 3,
          results: [
            {
              id: "fr-1",
              adresse: "1 Rue A",
              ville: "Paris",
              code_postal: "75001",
              geom: { lat: 48.86, lon: 2.34 },
              prix: [{ "@nom": "Gazole", "@valeur": 1.68, "@maj": "2026-03-20T10:00:00Z" }]
            },
            {
              id: "fr-2",
              adresse: "2 Rue B",
              ville: "Lyon",
              code_postal: "69001",
              geom: { lat: 45.76, lon: 4.84 },
              prix: [{ "@nom": "SP98", "@valeur": 1.89, "@maj": "2026-03-20T11:00:00Z" }]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 3,
          results: [
            {
              id: "fr-3",
              adresse: "3 Rue C",
              ville: "Marseille",
              code_postal: "13001",
              geom: { lat: 43.29, lon: 5.37 },
              prix: [{ "@nom": "E10", "@valeur": 1.75, "@maj": "2026-03-20T12:00:00Z" }]
            }
          ]
        })
      }) as typeof fetch;

    const provider = new FranceFuelProvider();
    const stations = await provider.fetchStations();

    expect(stations).toHaveLength(3);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://example.test/fr?limit=2&offset=0",
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://example.test/fr?limit=2&offset=2",
      expect.any(Object)
    );
  });
});

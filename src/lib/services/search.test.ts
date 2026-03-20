const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    station: {
      findMany: vi.fn()
    }
  }
}));

import { searchStations } from "./search";

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("./settings", () => ({
  getSettings: vi.fn(async () => ({
    enabledProviderKeys: ["uk-gov"]
  }))
}));

describe("searchStations", () => {
  afterEach(() => {
    prismaMock.station.findMany.mockReset();
  });

  it("sorts by proximity when coordinates are provided", async () => {
    prismaMock.station.findMany.mockResolvedValue([
      {
        id: "paris",
        name: "Paris Fuel",
        city: "Paris",
        postcode: "75001",
        addressLine1: "1 Rue A",
        brand: "A",
        latitude: 48.8566,
        longitude: 2.3522,
        products: []
      },
      {
        id: "london",
        name: "London Fuel",
        city: "London",
        postcode: "NW1",
        addressLine1: "1 Street B",
        brand: "B",
        latitude: 51.5074,
        longitude: -0.1278,
        products: []
      }
    ]);

    const result = await searchStations({ latitude: 51.5, longitude: -0.12 });

    expect(result.map((station) => station.id)).toEqual(["london", "paris"]);
  });

  it("passes text filters to prisma", async () => {
    prismaMock.station.findMany.mockResolvedValue([]);

    await searchStations({ q: "London" });

    expect(prismaMock.station.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceKey: { in: ["uk-gov"] },
          OR: expect.arrayContaining([expect.objectContaining({ name: { contains: "London" } })])
        })
      })
    );
  });
});

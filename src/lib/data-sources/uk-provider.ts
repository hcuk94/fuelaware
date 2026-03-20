import { mockStations } from "./mock-data";
import { FuelCategory, SiteType, type FuelDataSource, type NormalizedStation } from "./types";

type UkApiRecord = {
  site_id?: string;
  station_id?: string;
  site_name?: string;
  brand?: string;
  address?: string;
  town?: string;
  postcode?: string;
  lat?: number | string;
  lon?: number | string;
  prices?: Record<string, number | string>;
  last_updated?: string;
};

function categoryFromCode(code: string): FuelCategory {
  if (code.toLowerCase().includes("diesel") || code.toLowerCase() === "b7") {
    return FuelCategory.DIESEL;
  }
  return FuelCategory.PETROL;
}

export class UkFuelProvider implements FuelDataSource {
  key = "uk-gov";
  label = "UK Fuel Finder";

  async fetchStations(): Promise<NormalizedStation[]> {
    const url = process.env.UK_FUEL_API_URL;
    if (!url) {
      return mockStations.filter((station) => station.sourceKey === this.key);
    }

    try {
      const response = await fetch(url, {
        headers: process.env.UK_FUEL_API_KEY
          ? { Authorization: `Bearer ${process.env.UK_FUEL_API_KEY}` }
          : undefined,
        next: { revalidate: 0 }
      });

      if (!response.ok) {
        throw new Error(`UK provider failed with ${response.status}`);
      }

      const payload = (await response.json()) as { stations?: UkApiRecord[]; data?: UkApiRecord[] };
      const records = payload.stations ?? payload.data ?? [];

      return records
        .filter((record) => record.lat && record.lon)
        .map((record) => {
          const observedAt = new Date(record.last_updated ?? Date.now());
          const products = Object.entries(record.prices ?? {}).map(([productCode, value]) => ({
            productCode,
            displayName: productCode.toUpperCase(),
            category: categoryFromCode(productCode),
            unit: "L",
            currency: "GBP",
            price: Number(value),
            observedAt
          }));

          return {
            sourceKey: this.key,
            externalId: record.site_id ?? record.station_id ?? crypto.randomUUID(),
            name: record.site_name ?? "Unnamed UK station",
            type: SiteType.STATION,
            countryCode: "GB",
            addressLine1: record.address,
            city: record.town,
            postcode: record.postcode,
            latitude: Number(record.lat),
            longitude: Number(record.lon),
            brand: record.brand,
            products
          };
        })
        .filter((station) => station.products.length > 0);
    } catch (error) {
      console.warn("Using UK mock data because provider fetch failed.", error);
      return mockStations.filter((station) => station.sourceKey === this.key);
    }
  }
}

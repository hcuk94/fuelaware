import { mockStations } from "./mock-data";
import { FuelCategory, SiteType, type FuelDataSource, type NormalizedStation } from "./types";

type FranceRecord = {
  id?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  geom?: { lat?: number; lon?: number };
  latitude?: number | string;
  longitude?: number | string;
  horaires_automate_24_24?: string;
  services_service?: string[];
  prix?: Array<{
    "@nom"?: string;
    "@valeur"?: string | number;
    "@maj"?: string;
  }>;
  prices?: Array<{
    name?: string;
    value?: string | number;
    updated_at?: string;
  }>;
  pop?: string;
};

type FrancePriceEntry =
  | {
      "@nom"?: string;
      "@valeur"?: string | number;
      "@maj"?: string;
    }
  | {
      name?: string;
      value?: string | number;
      updated_at?: string;
    };

function categoryFromFrenchName(name: string): FuelCategory {
  const normalized = name.toLowerCase();
  if (normalized.includes("gazole") || normalized.includes("diesel")) {
    return FuelCategory.DIESEL;
  }
  if (normalized.includes("gpl")) {
    return FuelCategory.LPG;
  }
  return FuelCategory.PETROL;
}

function normalizePriceEntry(entry: FrancePriceEntry) {
  if ("@nom" in entry || "@valeur" in entry || "@maj" in entry) {
    return {
      name: entry["@nom"],
      value: entry["@valeur"],
      updatedAt: entry["@maj"]
    };
  }

  const other = entry as Extract<FrancePriceEntry, { name?: string; value?: string | number; updated_at?: string }>;
  return {
    name: other.name,
    value: other.value,
    updatedAt: other.updated_at
  };
}

export class FranceFuelProvider implements FuelDataSource {
  key = "fr-open-data";
  label = "France Prix des carburants";

  async fetchStations(): Promise<NormalizedStation[]> {
    const url =
      process.env.FRANCE_FUEL_API_URL ??
      "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=100";

    try {
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (!response.ok) {
        throw new Error(`France provider failed with ${response.status}`);
      }

      const payload = (await response.json()) as { results?: FranceRecord[]; records?: FranceRecord[] };
      const records = payload.results ?? payload.records ?? [];

      const stations = records
        .map<NormalizedStation | null>((record) => {
          const latitude = Number(record.geom?.lat ?? record.latitude);
          const longitude = Number(record.geom?.lon ?? record.longitude);
          const rawPriceSource = record.prix ?? record.prices ?? [];
          const rawPrices = Array.isArray(rawPriceSource) ? (rawPriceSource as FrancePriceEntry[]) : [];

          const products = rawPrices
            .map((entry) => {
              const { name, value, updatedAt } = normalizePriceEntry(entry);
              if (!name || value == null) {
                return null;
              }

              return {
                productCode: name.toLowerCase().replaceAll(" ", "-"),
                displayName: name,
                category: categoryFromFrenchName(name),
                unit: "L",
                currency: "EUR",
                price: Number(value),
                observedAt: new Date(updatedAt ?? Date.now())
              };
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || products.length === 0) {
            return null;
          }

          return {
            sourceKey: this.key,
            externalId: record.id ?? crypto.randomUUID(),
            name: record.pop ? `Station ${record.pop}` : `Station ${record.ville ?? "France"}`,
            type: SiteType.STATION,
            countryCode: "FR",
            addressLine1: record.adresse,
            city: record.ville,
            postcode: record.code_postal,
            latitude,
            longitude,
            metadata: {
              automate24h: record.horaires_automate_24_24,
              services: record.services_service ?? []
            },
            products
          };
        })
        .filter((station): station is NormalizedStation => station !== null);

      if (records.length > 0 && stations.length === 0) {
        throw new Error("France provider returned no usable stations");
      }

      return stations;
    } catch (error) {
      console.warn("Using France mock data because provider fetch failed.", error);
      return mockStations.filter((station) => station.sourceKey === this.key);
    }
  }
}

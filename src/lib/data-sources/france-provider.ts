import { mockStations } from "./mock-data";
import { FuelCategory, SiteType, type FuelDataSource, type NormalizedStation } from "./types";
import { fetchWithEnvProxy } from "@/lib/fetch-with-env-proxy";

type FranceRecord = {
  id?: string | number;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  cp?: string;
  enseigne?: string;
  brand?: string;
  nom?: string;
  name?: string;
  geom?: { lat?: number; lon?: number };
  latitude?: number | string;
  longitude?: number | string;
  horaires_automate_24_24?: string;
  services_service?: string[];
  prix?:
    | string
    | Array<{
        "@nom"?: string;
        "@valeur"?: string | number;
        "@maj"?: string;
      }>;
  prices?: Array<{
    name?: string;
    value?: string | number;
    updated_at?: string;
  }>;
  gazole_prix?: number | string | null;
  gazole_maj?: string | null;
  sp95_prix?: number | string | null;
  sp95_maj?: string | null;
  e85_prix?: number | string | null;
  e85_maj?: string | null;
  gplc_prix?: number | string | null;
  gplc_maj?: string | null;
  e10_prix?: number | string | null;
  e10_maj?: string | null;
  sp98_prix?: number | string | null;
  sp98_maj?: string | null;
  pop?: string;
};

type FranceRawPrice =
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

type FrancePriceEntry = {
  name?: string;
  value?: string | number;
  updatedAt?: string;
};

type FranceNamedPrice = Extract<FranceRawPrice, { name?: string; value?: string | number; updated_at?: string }>;

const FRANCE_COLUMN_PRICE_FIELDS = [
  { name: "Gazole", priceKey: "gazole_prix", updatedAtKey: "gazole_maj" },
  { name: "SP95", priceKey: "sp95_prix", updatedAtKey: "sp95_maj" },
  { name: "E85", priceKey: "e85_prix", updatedAtKey: "e85_maj" },
  { name: "GPLc", priceKey: "gplc_prix", updatedAtKey: "gplc_maj" },
  { name: "E10", priceKey: "e10_prix", updatedAtKey: "e10_maj" },
  { name: "SP98", priceKey: "sp98_prix", updatedAtKey: "sp98_maj" }
] as const;

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

function normalizePriceEntry(entry: FranceRawPrice): FrancePriceEntry {
  if ("@nom" in entry || "@valeur" in entry || "@maj" in entry) {
    return {
      name: entry["@nom"],
      value: entry["@valeur"],
      updatedAt: entry["@maj"]
    };
  }

  const other = entry as FranceNamedPrice;
  return {
    name: other.name,
    value: other.value,
    updatedAt: other.updated_at
  };
}

function parsePriceArray(value: FranceRecord["prix"] | FranceRecord["prices"]) {
  if (Array.isArray(value)) {
    return value as FranceRawPrice[];
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as FranceRawPrice[]) : [];
  } catch {
    return [];
  }
}

function getColumnPrices(record: FranceRecord): FrancePriceEntry[] {
  return FRANCE_COLUMN_PRICE_FIELDS.flatMap(({ name, priceKey, updatedAtKey }) => {
    const value = record[priceKey];
    if (value == null) {
      return [];
    }

    return [
      {
        name,
        value,
        updatedAt: record[updatedAtKey] ?? undefined
      }
    ];
  });
}

function getStationName(record: FranceRecord) {
  const explicitName = record.enseigne ?? record.brand ?? record.nom ?? record.name;
  if (explicitName?.trim()) {
    return explicitName.trim();
  }

  if (record.adresse?.trim()) {
    return record.adresse.trim();
  }

  if (record.ville?.trim()) {
    return `Station ${record.ville.trim()}`;
  }

  return "Station France";
}

export class FranceFuelProvider implements FuelDataSource {
  key = "fr-open-data";
  label = "France Prix des carburants";

  async fetchStations(): Promise<NormalizedStation[]> {
    const baseUrl =
      process.env.FRANCE_FUEL_API_URL ??
      "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";

    try {
      const records = await this.fetchAllRecords(baseUrl);

      const stations = records
        .map<NormalizedStation | null>((record) => {
          const latitude = Number(record.geom?.lat ?? record.latitude);
          const longitude = Number(record.geom?.lon ?? record.longitude);
          const rawPrices = parsePriceArray(record.prix ?? record.prices);
          const normalizedPriceEntries =
            rawPrices.length > 0 ? rawPrices.map((entry) => normalizePriceEntry(entry)) : getColumnPrices(record);

          const products = normalizedPriceEntries
            .map((entry) => {
              const { name, value, updatedAt } = entry;
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
            externalId: record.id != null ? String(record.id) : crypto.randomUUID(),
            name: getStationName(record),
            type: SiteType.STATION,
            countryCode: "FR",
            addressLine1: record.adresse,
            city: record.ville,
            postcode: record.code_postal ?? record.cp,
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

  private async fetchAllRecords(baseUrl: string) {
    const initialUrl = new URL(baseUrl);
    const limit = Number(initialUrl.searchParams.get("limit") ?? "100");
    const pageSize = Number.isFinite(limit) && limit > 0 ? limit : 100;
    const initialOffset = Number(initialUrl.searchParams.get("offset") ?? "0");
    const offsetBase = Number.isFinite(initialOffset) && initialOffset >= 0 ? initialOffset : 0;
    const records: FranceRecord[] = [];
    let page = 0;
    let totalCount: number | undefined;

    while (true) {
      const pageUrl = new URL(baseUrl);
      pageUrl.searchParams.set("limit", String(pageSize));
      pageUrl.searchParams.set("offset", String(offsetBase + page * pageSize));

      const response = await fetchWithEnvProxy(pageUrl.toString(), { next: { revalidate: 0 } });
      if (!response.ok) {
        throw new Error(`France provider failed with ${response.status}`);
      }

      const payload = (await response.json()) as {
        total_count?: number;
        results?: FranceRecord[];
        records?: FranceRecord[];
      };
      const pageRecords = payload.results ?? payload.records ?? [];
      totalCount = payload.total_count ?? totalCount;
      records.push(...pageRecords);

      if (pageRecords.length < pageSize) {
        break;
      }

      if (typeof totalCount === "number" && records.length >= totalCount) {
        break;
      }

      page += 1;
    }

    return records;
  }
}

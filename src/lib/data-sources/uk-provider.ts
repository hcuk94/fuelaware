import { mockStations } from "./mock-data";
import { FuelCategory, SiteType, type FuelDataSource, type NormalizedStation } from "./types";
import { fetchWithEnvProxy } from "@/lib/fetch-with-env-proxy";

type UkApiRecord = {
  id?: string;
  site_id?: string;
  forecourt_id?: string;
  station_id?: string;
  forecourt_name?: string;
  site_name?: string;
  name?: string;
  brand?: string;
  operator?: string;
  address?: string;
  address_line_1?: string;
  line_1?: string;
  town?: string;
  city?: string;
  postcode?: string;
  lat?: number | string;
  latitude?: number | string;
  lon?: number | string;
  lng?: number | string;
  longitude?: number | string;
  prices?: Record<string, number | string>;
  fuel_type?: string;
  product_code?: string;
  price?: number | string;
  unit?: string;
  currency?: string;
  last_updated?: string;
  updated_at?: string;
  observed_at?: string;
  forecourt?: UkApiRecord;
  station?: UkApiRecord;
  site?: UkApiRecord;
};

function categoryFromCode(code: string): FuelCategory {
  const normalizedCode = code.toLowerCase();
  if (normalizedCode.includes("diesel") || normalizedCode === "b7") {
    return FuelCategory.DIESEL;
  }
  if (normalizedCode.includes("electric") || normalizedCode.includes("ev")) {
    return FuelCategory.ELECTRIC;
  }
  if (normalizedCode.includes("hydrogen")) {
    return FuelCategory.HYDROGEN;
  }
  if (normalizedCode.includes("lpg")) {
    return FuelCategory.LPG;
  }
  return FuelCategory.PETROL;
}

type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  data?: {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
  };
};

let cachedToken:
  | {
      accessToken: string;
      expiresAt: number;
      cacheKey: string;
    }
  | undefined;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getApiRootUrl() {
  return (process.env.UK_FUEL_API_URL?.trim() || "https://www.fuel-finder.service.gov.uk/api/v1/").replace(
    /\/$/,
    ""
  );
}

function getForecourtsUrl() {
  const apiRootUrl = getApiRootUrl();
  if (apiRootUrl.endsWith("/pfs")) {
    return apiRootUrl;
  }

  return `${apiRootUrl}/pfs`;
}

function getFuelPricesUrl() {
  const apiRootUrl = getApiRootUrl();
  if (apiRootUrl.endsWith("/pfs/fuel-prices")) {
    return apiRootUrl;
  }

  return `${apiRootUrl}/pfs/fuel-prices`;
}

function getTokenUrl() {
  const configuredTokenUrl = process.env.UK_FUEL_TOKEN_URL?.trim();
  if (configuredTokenUrl) {
    return configuredTokenUrl;
  }

  return "https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token";
}

function getObservedAt(record: UkApiRecord) {
  return new Date(record.last_updated ?? record.updated_at ?? record.observed_at ?? Date.now());
}

function getRecordContainer(record: UkApiRecord) {
  return record.forecourt ?? record.station ?? record.site ?? record;
}

function extractRecords(payload: unknown): UkApiRecord[] {
  if (Array.isArray(payload)) {
    return payload as UkApiRecord[];
  }

  const payloadRecord = asRecord(payload);
  if (!payloadRecord) {
    return [];
  }

  const collection =
    payloadRecord.stations ??
    payloadRecord.data ??
    payloadRecord.results ??
    payloadRecord.items ??
    payloadRecord.prices;

  return Array.isArray(collection) ? (collection as UkApiRecord[]) : [];
}

async function fetchAllRecords(url: string, accessToken: string | undefined) {
  const records: UkApiRecord[] = [];
  let batchNumber = 1;

  while (batchNumber <= 100) {
    const batchUrl = new URL(url);
    batchUrl.searchParams.set("batch-number", String(batchNumber));

    const response = await fetchWithEnvProxy(batchUrl.toString(), {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      cache: "no-store",
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`UK provider failed with ${response.status}`);
    }

    const payload = await response.json();
    const batchRecords = extractRecords(payload);
    records.push(...batchRecords);

    if (batchRecords.length < 500) {
      break;
    }

    batchNumber += 1;
  }

  return records;
}

function getStationIdentity(record: UkApiRecord) {
  const container = getRecordContainer(record);
  return (
    asString(container.forecourt_id) ??
    asString(container.site_id) ??
    asString(container.station_id) ??
    asString(container.id) ??
    crypto.randomUUID()
  );
}

function buildStationSeed(record: UkApiRecord) {
  const container = getRecordContainer(record);
  const latitude =
    asNumber(container.lat) ??
    asNumber(container.latitude) ??
    asNumber(container.lng) ??
    asNumber(container.longitude);
  const longitude =
    asNumber(container.lon) ??
    asNumber(container.longitude) ??
    asNumber(container.lng) ??
    asNumber(container.latitude);

  if (latitude === undefined || longitude === undefined) {
    return undefined;
  }

  const station: NormalizedStation = {
    sourceKey: "uk-gov",
    externalId: getStationIdentity(record),
    name: asString(container.site_name) ?? asString(container.forecourt_name) ?? asString(container.name) ?? "Unnamed UK station",
    type: SiteType.STATION,
    countryCode: "GB",
    addressLine1:
      asString(container.address) ?? asString(container.address_line_1) ?? asString(container.line_1),
    city: asString(container.town) ?? asString(container.city),
    postcode: asString(container.postcode),
    latitude,
    longitude,
    brand: asString(container.brand),
    operatorName: asString(container.operator),
    products: []
  };

  return station;
}

function extractProducts(record: UkApiRecord) {
  if (record.prices && typeof record.prices === "object") {
    const observedAt = getObservedAt(record);
    return Object.entries(record.prices)
      .map(([productCode, value]) => {
        const price = asNumber(value);
        if (price === undefined) {
          return undefined;
        }

        return {
          productCode,
          displayName: productCode.toUpperCase(),
          category: categoryFromCode(productCode),
          unit: "L",
          currency: "GBP",
          price,
          observedAt
        };
      })
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
  }

  const productCode = asString(record.fuel_type) ?? asString(record.product_code);
  const price = asNumber(record.price);
  if (!productCode || price === undefined) {
    return [];
  }

  return [
    {
      productCode,
      displayName: productCode.toUpperCase(),
      category: categoryFromCode(productCode),
      unit: asString(record.unit) ?? "L",
      currency: asString(record.currency) ?? "GBP",
      price,
      observedAt: getObservedAt(record)
    }
  ];
}

async function getAccessToken() {
  const clientId = process.env.UK_FUEL_CLIENT_ID?.trim();
  const clientSecret = process.env.UK_FUEL_CLIENT_SECRET?.trim();

  if (!clientId && !clientSecret) {
    return undefined;
  }

  if (!clientId || !clientSecret) {
    throw new Error("UK provider requires both UK_FUEL_CLIENT_ID and UK_FUEL_CLIENT_SECRET");
  }

  const scope = process.env.UK_FUEL_API_SCOPE?.trim() || "fuelfinder.read";
  const tokenUrl = getTokenUrl();
  const cacheKey = `${tokenUrl}|${clientId}|${scope}`;

  if (cachedToken && cachedToken.cacheKey === cacheKey && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const response = await fetchWithEnvProxy(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope
    }),
    cache: "no-store",
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`UK token request failed with ${response.status}`);
  }

  const payload = (await response.json()) as OAuthTokenResponse;
  const tokenPayload = payload.data ?? payload;
  if (!tokenPayload.access_token) {
    throw new Error("UK token response did not include an access token");
  }

  cachedToken = {
    accessToken: tokenPayload.access_token,
    expiresAt: Date.now() + (tokenPayload.expires_in ?? 3600) * 1000,
    cacheKey
  };

  return tokenPayload.access_token;
}

export class UkFuelProvider implements FuelDataSource {
  key = "uk-gov";
  label = "UK Fuel Finder";

  async fetchStations(): Promise<NormalizedStation[]> {
    try {
      const accessToken = await getAccessToken();
      const [forecourtRecords, fuelPriceRecords] = await Promise.all([
        fetchAllRecords(getForecourtsUrl(), accessToken),
        fetchAllRecords(getFuelPricesUrl(), accessToken)
      ]);
      const stationsById = new Map<string, NormalizedStation>();

      for (const record of forecourtRecords) {
        const station = buildStationSeed(record);
        if (!station) {
          continue;
        }

        stationsById.set(station.externalId, station);
      }

      for (const record of fuelPriceRecords) {
        const station = buildStationSeed(record);
        if (!station) {
          continue;
        }

        const existingStation = stationsById.get(station.externalId) ?? station;
        const products = extractProducts(record);

        existingStation.products.push(...products);
        stationsById.set(existingStation.externalId, existingStation);
      }

      return Array.from(stationsById.values()).filter((station) => station.products.length > 0);
    } catch (error) {
      console.warn("Using UK mock data because provider fetch failed.", error);
      return mockStations.filter((station) => station.sourceKey === this.key);
    }
  }
}

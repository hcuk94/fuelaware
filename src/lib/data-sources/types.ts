export const FuelCategory = {
  PETROL: "PETROL",
  DIESEL: "DIESEL",
  ELECTRIC: "ELECTRIC",
  LPG: "LPG",
  HYDROGEN: "HYDROGEN",
  OTHER: "OTHER"
} as const;

export type FuelCategory = (typeof FuelCategory)[keyof typeof FuelCategory];

export const SiteType = {
  STATION: "STATION",
  CHARGER: "CHARGER"
} as const;

export type SiteType = (typeof SiteType)[keyof typeof SiteType];

export type NormalizedFuelProduct = {
  productCode: string;
  displayName: string;
  category: FuelCategory;
  unit: string;
  currency: string;
  price: number;
  observedAt: Date;
  metadata?: Record<string, unknown>;
};

export type NormalizedStation = {
  sourceKey: string;
  externalId: string;
  name: string;
  type: SiteType;
  countryCode: string;
  addressLine1?: string;
  city?: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  brand?: string;
  operatorName?: string;
  metadata?: Record<string, unknown>;
  products: NormalizedFuelProduct[];
};

export interface FuelDataSource {
  key: string;
  label: string;
  fetchStations(): Promise<NormalizedStation[]>;
}

import { FuelCategory, SiteType } from "@prisma/client";

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

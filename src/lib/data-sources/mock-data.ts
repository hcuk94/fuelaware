import { FuelCategory, SiteType } from "@prisma/client";
import type { NormalizedStation } from "./types";

const now = new Date();

export const mockStations: NormalizedStation[] = [
  {
    sourceKey: "uk-gov",
    externalId: "uk-1",
    name: "Camden Road Fuel Hub",
    type: SiteType.STATION,
    countryCode: "GB",
    addressLine1: "181 Camden Road",
    city: "London",
    postcode: "NW1",
    latitude: 51.544,
    longitude: -0.142,
    brand: "FuelAware Demo",
    operatorName: "FuelAware UK",
    products: [
      {
        productCode: "e10",
        displayName: "Unleaded E10",
        category: FuelCategory.PETROL,
        unit: "L",
        currency: "GBP",
        price: 1.529,
        observedAt: now
      },
      {
        productCode: "b7",
        displayName: "Diesel B7",
        category: FuelCategory.DIESEL,
        unit: "L",
        currency: "GBP",
        price: 1.589,
        observedAt: now
      }
    ]
  },
  {
    sourceKey: "uk-gov",
    externalId: "uk-2",
    name: "Bristol Ring Service Station",
    type: SiteType.STATION,
    countryCode: "GB",
    addressLine1: "42 Ring Road",
    city: "Bristol",
    postcode: "BS5",
    latitude: 51.462,
    longitude: -2.537,
    brand: "FuelAware Demo",
    operatorName: "FuelAware UK",
    products: [
      {
        productCode: "e10",
        displayName: "Unleaded E10",
        category: FuelCategory.PETROL,
        unit: "L",
        currency: "GBP",
        price: 1.499,
        observedAt: now
      },
      {
        productCode: "b7",
        displayName: "Diesel B7",
        category: FuelCategory.DIESEL,
        unit: "L",
        currency: "GBP",
        price: 1.561,
        observedAt: now
      }
    ]
  },
  {
    sourceKey: "fr-open-data",
    externalId: "fr-1",
    name: "Station République",
    type: SiteType.STATION,
    countryCode: "FR",
    addressLine1: "12 Rue du Temple",
    city: "Paris",
    postcode: "75003",
    latitude: 48.864,
    longitude: 2.363,
    brand: "Prix Carburants",
    operatorName: "FuelAware FR",
    products: [
      {
        productCode: "gazole",
        displayName: "Gazole",
        category: FuelCategory.DIESEL,
        unit: "L",
        currency: "EUR",
        price: 1.719,
        observedAt: now
      },
      {
        productCode: "sp95-e10",
        displayName: "SP95-E10",
        category: FuelCategory.PETROL,
        unit: "L",
        currency: "EUR",
        price: 1.789,
        observedAt: now
      }
    ]
  },
  {
    sourceKey: "fr-open-data",
    externalId: "fr-2",
    name: "Lyon Centre Energie",
    type: SiteType.STATION,
    countryCode: "FR",
    addressLine1: "88 Avenue Berthelot",
    city: "Lyon",
    postcode: "69007",
    latitude: 45.741,
    longitude: 4.842,
    brand: "Prix Carburants",
    operatorName: "FuelAware FR",
    products: [
      {
        productCode: "gazole",
        displayName: "Gazole",
        category: FuelCategory.DIESEL,
        unit: "L",
        currency: "EUR",
        price: 1.689,
        observedAt: now
      },
      {
        productCode: "e85",
        displayName: "E85",
        category: FuelCategory.PETROL,
        unit: "L",
        currency: "EUR",
        price: 0.999,
        observedAt: now
      }
    ]
  }
];

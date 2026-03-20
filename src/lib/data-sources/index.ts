import { FranceFuelProvider } from "./france-provider";
import { UkFuelProvider } from "./uk-provider";
import type { FuelDataSource } from "./types";

export const dataSources: FuelDataSource[] = [new UkFuelProvider(), new FranceFuelProvider()];
export const providerCatalog = dataSources.map((source) => ({
  key: source.key,
  label: source.label
}));

export function getDataSourcesByKeys(keys: string[]) {
  const enabledKeys = new Set(keys);
  return dataSources.filter((source) => enabledKeys.has(source.key));
}

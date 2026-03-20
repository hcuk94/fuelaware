import { FranceFuelProvider } from "./france-provider";
import { UkFuelProvider } from "./uk-provider";
import type { FuelDataSource } from "./types";

export const dataSources: FuelDataSource[] = [new UkFuelProvider(), new FranceFuelProvider()];

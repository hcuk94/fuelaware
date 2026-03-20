import Decimal from "decimal.js";
import { PrismaClient } from "@prisma/client";
import { dataSources } from "@/lib/data-sources";
import type { FuelDataSource } from "@/lib/data-sources/types";
import { prisma as sharedPrisma } from "@/lib/prisma";
import { evaluateAlertsForProduct } from "./alerts";

type IngestSummary = { source: string; stations: number; products: number };

type IngestProgress =
  | {
      phase: "fetching";
      source: string;
      sourceIndex: number;
      totalSources: number;
    }
  | {
      phase: "processing";
      source: string;
      sourceIndex: number;
      totalSources: number;
      stationIndex: number;
      stationCount: number;
    }
  | {
      phase: "completed-source";
      source: string;
      sourceIndex: number;
      totalSources: number;
      summary: IngestSummary;
    };

type IngestOptions = {
  sources?: FuelDataSource[];
  onProgress?: (progress: IngestProgress) => Promise<void> | void;
};

function normalizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(metadata));
}

export async function ingestLatestSnapshots(client: PrismaClient = sharedPrisma, options: IngestOptions = {}) {
  const summaries: IngestSummary[] = [];
  const sources = options.sources ?? dataSources;
  const totalSources = sources.length;
  const settings = await client.appSettings.findUnique({
    where: { id: "singleton" },
    select: { storeStationHistoryForAll: true }
  });
  const storeStationHistoryForAll = settings?.storeStationHistoryForAll ?? false;
  const favouriteStationIds = storeStationHistoryForAll
    ? new Set<string>()
    : new Set(
        (
          await client.favourite.findMany({
            select: { stationId: true }
          })
        ).map((favourite) => favourite.stationId)
      );

  for (const [sourceIndex, source] of sources.entries()) {
    await options.onProgress?.({
      phase: "fetching",
      source: source.label,
      sourceIndex,
      totalSources
    });
    const stations = await source.fetchStations();
    let productCount = 0;

    for (const [stationIndex, station] of stations.entries()) {
      await options.onProgress?.({
        phase: "processing",
        source: source.label,
        sourceIndex,
        totalSources,
        stationIndex,
        stationCount: stations.length
      });
      const storedStation = await client.station.upsert({
        where: {
          sourceKey_externalId: {
            sourceKey: station.sourceKey,
            externalId: station.externalId
          }
        },
        update: {
          name: station.name,
          type: station.type,
          countryCode: station.countryCode,
          addressLine1: station.addressLine1,
          city: station.city,
          postcode: station.postcode,
          latitude: station.latitude,
          longitude: station.longitude,
          brand: station.brand,
          operatorName: station.operatorName,
          metadata: normalizeMetadata(station.metadata)
        },
        create: {
          sourceKey: station.sourceKey,
          externalId: station.externalId,
          name: station.name,
          type: station.type,
          countryCode: station.countryCode,
          addressLine1: station.addressLine1,
          city: station.city,
          postcode: station.postcode,
          latitude: station.latitude,
          longitude: station.longitude,
          brand: station.brand,
          operatorName: station.operatorName,
          metadata: normalizeMetadata(station.metadata)
        }
      });

      for (const product of station.products) {
        productCount += 1;
        const storedProduct = await client.fuelProduct.upsert({
          where: {
            stationId_productCode: {
              stationId: storedStation.id,
              productCode: product.productCode
            }
          },
          update: {
            displayName: product.displayName,
            category: product.category,
            unit: product.unit,
            currency: product.currency,
            lastPrice: new Decimal(product.price),
            lastUpdatedAt: product.observedAt,
            metadata: normalizeMetadata(product.metadata)
          },
          create: {
            stationId: storedStation.id,
            productCode: product.productCode,
            displayName: product.displayName,
            category: product.category,
            unit: product.unit,
            currency: product.currency,
            lastPrice: new Decimal(product.price),
            lastUpdatedAt: product.observedAt,
            metadata: normalizeMetadata(product.metadata)
          }
        });

        const shouldStoreHistory = storeStationHistoryForAll || favouriteStationIds.has(storedStation.id);
        if (!shouldStoreHistory) {
          continue;
        }

        await client.priceSnapshot.create({
          data: {
            fuelProductId: storedProduct.id,
            price: new Decimal(product.price),
            currency: product.currency,
            unit: product.unit,
            observedAt: product.observedAt
          }
        });

        await evaluateAlertsForProduct(client, storedProduct.id);
      }
    }

    const summary = {
      source: source.label,
      stations: stations.length,
      products: productCount
    };

    summaries.push(summary);
    await options.onProgress?.({
      phase: "completed-source",
      source: source.label,
      sourceIndex,
      totalSources,
      summary
    });
  }

  return summaries;
}

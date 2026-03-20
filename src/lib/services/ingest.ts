import Decimal from "decimal.js";
import { PrismaClient } from "@prisma/client";
import { dataSources } from "@/lib/data-sources";
import { prisma as sharedPrisma } from "@/lib/prisma";
import { evaluateAlertsForProduct } from "./alerts";

function normalizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(metadata));
}

export async function ingestLatestSnapshots(client: PrismaClient = sharedPrisma) {
  const summaries: Array<{ source: string; stations: number; products: number }> = [];

  for (const source of dataSources) {
    const stations = await source.fetchStations();
    let productCount = 0;

    for (const station of stations) {
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

    summaries.push({
      source: source.label,
      stations: stations.length,
      products: productCount
    });
  }

  return summaries;
}

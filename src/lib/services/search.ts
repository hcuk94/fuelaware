import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/utils/distance";

type SearchOptions = {
  q?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
};

export async function searchStations(options: SearchOptions) {
  const limit = options.limit ?? 20;
  const where = options.q
    ? {
        OR: [
          { name: { contains: options.q } },
          { city: { contains: options.q } },
          { postcode: { contains: options.q } },
          { addressLine1: { contains: options.q } },
          { brand: { contains: options.q } }
        ]
      }
    : {};

  const stations = await prisma.station.findMany({
    where,
    include: {
      products: {
        orderBy: { displayName: "asc" }
      }
    },
    take: 100
  });

  const withDistance = stations.map((station) => {
    const distance =
      options.latitude != null && options.longitude != null
        ? distanceKm(options.latitude, options.longitude, station.latitude, station.longitude)
        : null;

    return {
      ...station,
      distanceKm: distance
    };
  });

  return withDistance
    .sort((left, right) => {
      if (left.distanceKm == null && right.distanceKm == null) {
        return left.name.localeCompare(right.name);
      }
      if (left.distanceKm == null) return 1;
      if (right.distanceKm == null) return -1;
      return left.distanceKm - right.distanceKm;
    })
    .slice(0, limit);
}

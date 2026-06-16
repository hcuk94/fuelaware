import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/utils/distance";
import { getSettings } from "./settings";

type SearchOptions = {
  q?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
};

type SearchProduct = {
  id: string;
  displayName: string;
  lastPrice: unknown;
  currency: string;
  unit: string;
};

type SearchStation = {
  id: string;
  name: string;
  city: string | null;
  postcode: string | null;
  addressLine1: string | null;
  brand: string | null;
  latitude: number;
  longitude: number;
  countryCode: string;
  products: SearchProduct[];
};

type SearchResult = SearchStation & {
  distanceKm: number | null;
};

function buildUkPostcodeVariants(query: string) {
  const compact = query.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{5,7}$/.test(compact) || compact.length <= 3) {
    return [];
  }

  const spaced = `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  return Array.from(new Set([query, compact, spaced]));
}

export async function searchStations(options: SearchOptions) {
  const limit = options.limit ?? 20;
  const settings = await getSettings();
  const query = options.q?.trim();
  const postcodeVariants = query ? buildUkPostcodeVariants(query) : [];
  const where = {
    sourceKey: {
      in: settings.enabledProviderKeys
    },
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { city: { contains: query } },
            ...postcodeVariants.map((postcode) => ({
              postcode: { contains: postcode }
            })),
            { addressLine1: { contains: query } },
            { brand: { contains: query } }
          ]
        }
      : {})
  };

  const stations = await prisma.station.findMany({
    where,
    include: {
      products: {
        orderBy: { displayName: "asc" }
      }
    },
    take: 100
  });

  const withDistance = (stations as SearchStation[]).map((station: SearchStation): SearchResult => {
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
    .sort((left: SearchResult, right: SearchResult) => {
      if (left.distanceKm == null && right.distanceKm == null) {
        return left.name.localeCompare(right.name);
      }
      if (left.distanceKm == null) return 1;
      if (right.distanceKm == null) return -1;
      return left.distanceKm - right.distanceKm;
    })
    .slice(0, limit);
}

import { notFound } from "next/navigation";
import { PriceChart } from "@/components/price-chart";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";
import { normalizeSnapshotSeries } from "@/lib/utils/snapshots";
import { buildDisplayStationName } from "@/lib/utils/station-name";
import { formatDate, formatPrice } from "@/lib/utils/format";

type StationSnapshot = {
  observedAt: Date;
  price: unknown;
};

type StationProduct = {
  id: string;
  displayName: string;
  lastPrice: unknown;
  currency: string;
  unit: string;
  lastUpdatedAt: Date;
  snapshots: StationSnapshot[];
};

type StationRecord = {
  countryCode: string;
  name: string;
  brand: string | null;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
  products: StationProduct[];
};

export default async function StationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const settings = await getSettings();
  const station = await prisma.station.findFirst({
    where: {
      id: stationId,
      sourceKey: {
        in: settings.enabledProviderKeys
      }
    },
    include: {
      products: {
        include: {
          snapshots: {
            orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
            take: 240
          }
        },
        orderBy: { displayName: "asc" }
      }
    }
  });

  if (!station) {
    notFound();
  }

  const typedStation = station as StationRecord;

  return (
    <main className="main-grid">
      <section className="hero">
        <div className="hero-copy stack">
          <span className="eyebrow">{typedStation.countryCode}</span>
          <h1>{buildDisplayStationName(typedStation.name, typedStation.brand)}</h1>
          <p>
            {typedStation.addressLine1 ? `${typedStation.addressLine1}, ` : ""}
            {typedStation.city ?? ""} {typedStation.postcode ?? ""}
          </p>
        </div>
      </section>

      {typedStation.products.map((product: StationProduct) => (
        <section key={product.id} className="card stack">
          <div className="section-heading">
            <div>
              <h2>{product.displayName}</h2>
              <p>Latest price: {formatPrice(Number(product.lastPrice), product.currency, product.unit)}</p>
            </div>
            <span className="muted">Updated {formatDate(product.lastUpdatedAt)}</span>
          </div>
          <PriceChart
            data={normalizeSnapshotSeries(product.snapshots)}
            currency={product.currency}
            unit={product.unit}
          />
        </section>
      ))}
    </main>
  );
}

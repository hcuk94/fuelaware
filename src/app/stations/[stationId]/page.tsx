import { notFound } from "next/navigation";
import { PriceChart } from "@/components/price-chart";
import { prisma } from "@/lib/prisma";
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
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
  products: StationProduct[];
};

export default async function StationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await params;
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      products: {
        include: {
          snapshots: {
            orderBy: { observedAt: "asc" },
            take: 120
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
          <h1>{typedStation.name}</h1>
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
            data={product.snapshots.map((snapshot: StationSnapshot) => ({
              observedAt: snapshot.observedAt.toISOString(),
              price: Number(snapshot.price)
            }))}
            currency={product.currency}
            unit={product.unit}
          />
        </section>
      ))}
    </main>
  );
}

import { notFound } from "next/navigation";
import { PriceChart } from "@/components/price-chart";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils/format";

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

  return (
    <main className="main-grid">
      <section className="hero">
        <div className="hero-copy stack">
          <span className="eyebrow">{station.countryCode}</span>
          <h1>{station.name}</h1>
          <p>
            {station.addressLine1 ? `${station.addressLine1}, ` : ""}
            {station.city ?? ""} {station.postcode ?? ""}
          </p>
        </div>
      </section>

      {station.products.map((product) => (
        <section key={product.id} className="card stack">
          <div className="section-heading">
            <div>
              <h2>{product.displayName}</h2>
              <p>Latest price: {formatPrice(Number(product.lastPrice), product.currency, product.unit)}</p>
            </div>
            <span className="muted">Updated {formatDate(product.lastUpdatedAt)}</span>
          </div>
          <PriceChart
            data={product.snapshots.map((snapshot) => ({
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

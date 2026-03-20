"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, formatPrice } from "@/lib/utils/format";

type FavouriteProduct = {
  id: string;
  displayName: string;
  lastPrice: string;
  currency: string;
  unit: string;
};

type Favourite = {
  id: string;
  nickname: string | null;
  station: {
    id: string;
    name: string;
    city: string | null;
    addressLine1: string | null;
    products: FavouriteProduct[];
  };
  alerts: Array<{
    id: string;
    thresholdPrice: string | null;
    lowestLookbackDays: number | null;
    fuelProductId: string | null;
    lastTriggeredAt: string | null;
  }>;
};

export function FavouritesList({ favourites }: { favourites: Favourite[] }) {
  const router = useRouter();
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<Record<string, string>>({});

  async function createThresholdAlert(favouriteId: string, fuelProductId: string) {
    setSavingFor(favouriteId);
    await fetch(`/api/favourites/${favouriteId}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fuelProductId,
        thresholdPrice: thresholds[favouriteId]
      })
    });
    setSavingFor(null);
    router.refresh();
  }

  async function createLowestAlert(favouriteId: string, fuelProductId: string) {
    setSavingFor(favouriteId);
    await fetch(`/api/favourites/${favouriteId}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fuelProductId,
        lowestLookbackDays: 30
      })
    });
    setSavingFor(null);
    router.refresh();
  }

  return (
    <section className="card stack">
      <div className="section-heading">
        <div>
          <h2>Favourites</h2>
          <p>Track saved stations, review the latest prices, and create email alerts.</p>
        </div>
      </div>
      {favourites.length === 0 ? <p className="muted">No favourites yet. Search and save a station to start tracking.</p> : null}
      <div className="results-grid">
        {favourites.map((favourite) => (
          <article key={favourite.id} className="result-card">
            <div className="section-heading">
              <div>
                <h3>{favourite.nickname ?? favourite.station.name}</h3>
                <p>
                  {favourite.station.addressLine1 ? `${favourite.station.addressLine1}, ` : ""}
                  {favourite.station.city ?? ""}
                </p>
              </div>
              <a className="button-secondary link-button" href={`/stations/${favourite.station.id}`}>
                Open
              </a>
            </div>

            <ul className="product-list">
              {favourite.station.products.map((product) => (
                <li key={product.id}>
                  <span>{product.displayName}</span>
                  <strong>{formatPrice(Number(product.lastPrice), product.currency, product.unit)}</strong>
                </li>
              ))}
            </ul>

            <div className="alert-builder">
              <label>
                Threshold alert
                <input
                  type="number"
                  step="0.001"
                  placeholder="1.500"
                  value={thresholds[favourite.id] ?? ""}
                  onChange={(event) =>
                    setThresholds((current) => ({
                      ...current,
                      [favourite.id]: event.target.value
                    }))
                  }
                />
              </label>
              <div className="actions">
                <button
                  type="button"
                  disabled={savingFor === favourite.id || favourite.station.products.length === 0}
                  onClick={() => createThresholdAlert(favourite.id, favourite.station.products[0].id)}
                >
                  Alert on drop
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={savingFor === favourite.id || favourite.station.products.length === 0}
                  onClick={() => createLowestAlert(favourite.id, favourite.station.products[0].id)}
                >
                  Alert on 30-day low
                </button>
              </div>
            </div>

            {favourite.alerts.length > 0 ? (
              <div className="alert-list">
                {favourite.alerts.map((alert) => (
                  <p key={alert.id} className="muted">
                    {alert.thresholdPrice
                      ? `Threshold: ${alert.thresholdPrice}`
                      : `Lowest in ${alert.lowestLookbackDays} days`}
                    {alert.lastTriggeredAt ? ` • last triggered ${formatDate(alert.lastTriggeredAt)}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

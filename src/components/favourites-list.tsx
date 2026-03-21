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
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>(
    Object.fromEntries(
      favourites
        .filter((favourite) => favourite.station.products.length > 0)
        .map((favourite) => [favourite.id, favourite.station.products[0].id])
    )
  );

  async function removeFavourite(favouriteId: string) {
    setSavingFor(favouriteId);
    await fetch(`/api/favourites/${favouriteId}`, {
      method: "DELETE"
    });
    setSavingFor(null);
    router.refresh();
  }

  async function removeAlert(favouriteId: string, alertId: string) {
    setSavingFor(favouriteId);
    await fetch(`/api/favourites/${favouriteId}/alerts/${alertId}`, {
      method: "DELETE"
    });
    setSavingFor(null);
    router.refresh();
  }

  async function createThresholdAlert(favouriteId: string) {
    const fuelProductId = selectedProducts[favouriteId];
    if (!fuelProductId) {
      return;
    }

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

  async function createLowestAlert(favouriteId: string) {
    const fuelProductId = selectedProducts[favouriteId];
    if (!fuelProductId) {
      return;
    }

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
              <div className="actions">
                <a className="button-secondary link-button" href={`/stations/${favourite.station.id}`}>
                  Open
                </a>
                <button
                  type="button"
                  className="button-danger"
                  aria-label={`Remove ${favourite.nickname ?? favourite.station.name} from favourites`}
                  disabled={savingFor === favourite.id}
                  onClick={() => removeFavourite(favourite.id)}
                >
                  X
                </button>
              </div>
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
                Fuel type
                <select
                  value={selectedProducts[favourite.id] ?? favourite.station.products[0]?.id ?? ""}
                  onChange={(event) =>
                    setSelectedProducts((current) => ({
                      ...current,
                      [favourite.id]: event.target.value
                    }))
                  }
                  disabled={savingFor === favourite.id || favourite.station.products.length === 0}
                >
                  {favourite.station.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.displayName}
                    </option>
                  ))}
                </select>
              </label>
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
                  onClick={() => createThresholdAlert(favourite.id)}
                >
                  Alert on drop
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={savingFor === favourite.id || favourite.station.products.length === 0}
                  onClick={() => createLowestAlert(favourite.id)}
                >
                  Alert on 30-day low
                </button>
              </div>
            </div>

            {favourite.alerts.length > 0 ? (
              <div className="alert-list">
                {favourite.alerts.map((alert) => (
                  <div key={alert.id} className="alert-row">
                    <p className="muted">
                      {alert.fuelProductId
                        ? `${favourite.station.products.find((product) => product.id === alert.fuelProductId)?.displayName ?? "Selected fuel"} • `
                        : ""}
                      {alert.thresholdPrice
                        ? `Threshold: ${alert.thresholdPrice}`
                        : `Lowest in ${alert.lowestLookbackDays} days`}
                      {alert.lastTriggeredAt ? ` • last triggered ${formatDate(alert.lastTriggeredAt)}` : ""}
                    </p>
                    <button
                      type="button"
                      className="button-danger"
                      aria-label="Delete alert"
                      disabled={savingFor === favourite.id}
                      onClick={() => removeAlert(favourite.id, alert.id)}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

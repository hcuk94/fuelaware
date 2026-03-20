"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/lib/utils/format";

type SearchResult = {
  id: string;
  name: string;
  city: string | null;
  countryCode: string;
  addressLine1: string | null;
  distanceKm: number | null;
  products: Array<{
    id: string;
    displayName: string;
    lastPrice: string;
    currency: string;
    unit: string;
  }>;
};

export function SearchPanel({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  async function runSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (coords) {
      params.set("latitude", String(coords.latitude));
      params.set("longitude", String(coords.longitude));
    }

    const response = await fetch(`/api/search?${params.toString()}`);
    const payload = (await response.json()) as { stations: SearchResult[] };
    setResults(payload.stations);
    setLoading(false);
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition((position) => {
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    });
  }

  async function addFavourite(stationId: string) {
    const response = await fetch("/api/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationId })
    });

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <section className="card stack">
      <div className="section-heading">
        <div>
          <h2>Search nearby stations</h2>
          <p>Search by town, postcode, station name, or use your current location.</p>
        </div>
      </div>
      <div className="search-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="London, Paris, NW1, Lyon..."
        />
        <button type="button" onClick={runSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
        <button type="button" className="button-secondary" onClick={useMyLocation}>
          Use my location
        </button>
      </div>
      {coords ? (
        <p className="muted">
          Location set to {coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)}. Run search to sort by distance.
        </p>
      ) : null}
      <div className="results-grid">
        {results.map((station) => (
          <article key={station.id} className="result-card">
            <div className="result-header">
              <div>
                <h3>{station.name}</h3>
                <p>
                  {station.addressLine1 ? `${station.addressLine1}, ` : ""}
                  {station.city ?? station.countryCode}
                </p>
              </div>
              {station.distanceKm != null ? <span>{station.distanceKm.toFixed(1)} km</span> : null}
            </div>
            <ul className="product-list">
              {station.products.map((product) => (
                <li key={product.id}>
                  <span>{product.displayName}</span>
                  <strong>{formatPrice(Number(product.lastPrice), product.currency, product.unit)}</strong>
                </li>
              ))}
            </ul>
            <div className="actions">
              <a className="button-secondary link-button" href={`/stations/${station.id}`}>
                View history
              </a>
              {signedIn ? (
                <button type="button" onClick={() => addFavourite(station.id)}>
                  Add to favourites
                </button>
              ) : (
                <span className="muted">Sign in to favourite</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

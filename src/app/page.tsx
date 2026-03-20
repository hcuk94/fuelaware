import { FavouritesList } from "@/components/favourites-list";
import { SearchPanel } from "@/components/search-panel";
import { SignInCard } from "@/components/sign-in-card";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";

export default async function HomePage() {
  const session = await auth();
  const settings = await getSettings();
  const enabledStationFilter = {
    sourceKey: {
      in: settings.enabledProviderKeys
    }
  };
  const stationCount = await prisma.station.count({
    where: enabledStationFilter
  });
  const productCount = await prisma.fuelProduct.count({
    where: {
      station: enabledStationFilter
    }
  });
  const latestSnapshots = await prisma.priceSnapshot.count({
    where: {
      fuelProduct: {
        station: enabledStationFilter
      }
    }
  });

  const favourites = session?.user
    ? await prisma.favourite.findMany({
        where: {
          userId: session.user.id,
          station: enabledStationFilter
        },
        include: {
          station: {
            include: {
              products: {
                orderBy: { displayName: "asc" }
              }
            }
          },
          alerts: {
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return (
    <main className="main-grid">
      <section className="hero">
        <div className="hero-copy stack">
          <span className="eyebrow">Multi-country fuel intelligence</span>
          <h1>Track what your station charges, not just what it says today.</h1>
          <p>
            FuelAware normalizes country-specific fuel data into a single extensible model for stations, products, units, currencies, favourites, charts, and alerts.
          </p>
        </div>
        <div className="summary-grid">
          <div className="summary-tile">
            <span>Stations indexed</span>
            <strong>{stationCount}</strong>
          </div>
          <div className="summary-tile">
            <span>Fuel products</span>
            <strong>{productCount}</strong>
          </div>
          <div className="summary-tile">
            <span>Snapshots stored</span>
            <strong>{latestSnapshots}</strong>
          </div>
        </div>
      </section>

      {session?.user ? (
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Signed in</h2>
              <p>
                {session.user.email} • role: {session.user.role}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="button-secondary">
                Sign out
              </button>
            </form>
          </div>
        </section>
      ) : (
        <SignInCard registrationEnabled={settings.registrationEnabled} />
      )}

      <SearchPanel signedIn={Boolean(session?.user)} />

      {session?.user ? <FavouritesList favourites={JSON.parse(JSON.stringify(favourites))} /> : null}
    </main>
  );
}

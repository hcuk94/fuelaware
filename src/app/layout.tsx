import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { AuthSessionProvider } from "@/components/session-provider";
import { ensureAutomaticSyncScheduler } from "@/lib/services/auto-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "FuelAware",
  description: "Track fuel prices, favourites, history, and price alerts across countries."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  ensureAutomaticSyncScheduler();
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          <div className="app-shell">
            <header className="site-header">
              <a href="/" className="brand">
                <span className="brand-mark">FA</span>
                <div>
                  <strong>FuelAware</strong>
                  <p>Price tracking for stations and future energy networks</p>
                </div>
              </a>
              <nav className="nav-links">
                <a href="/">Dashboard</a>
                {session?.user?.role === "ADMIN" ? <a href="/admin">Admin</a> : null}
              </nav>
            </header>
            {children}
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

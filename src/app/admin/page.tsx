import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { auth } from "@/lib/auth";
import { getManualSyncState } from "@/lib/services/manual-sync";
import { getSettings } from "@/lib/services/settings";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const settings = await getSettings();
  const manualSync = await getManualSyncState();

  return (
    <main className="main-grid">
      <section className="hero">
        <div className="hero-copy stack">
          <span className="eyebrow">Administration</span>
          <h1>Control registration and ingestion.</h1>
          <p>FuelAware is intended for open source deployments where operators decide whether self-registration is enabled.</p>
        </div>
      </section>
      <AdminPanel settings={settings} initialManualSync={manualSync} />
    </main>
  );
}

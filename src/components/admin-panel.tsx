"use client";

import { useState } from "react";

type Settings = {
  registrationEnabled: boolean;
  allowManualSync: boolean;
  adminEmail: string | null;
};

export function AdminPanel({ settings }: { settings: Settings }) {
  const [form, setForm] = useState(settings);
  const [status, setStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function save() {
    setStatus("Saving...");
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setStatus(response.ok ? "Saved." : "Failed to save settings.");
  }

  async function syncNow() {
    setSyncing(true);
    const response = await fetch("/api/admin/sync", { method: "POST" });
    const payload = await response.json();
    setStatus(response.ok ? `Sync complete: ${payload.summary.map((item: { source: string; stations: number }) => `${item.source} (${item.stations})`).join(", ")}` : "Sync failed.");
    setSyncing(false);
  }

  return (
    <section className="card stack">
      <div className="section-heading">
        <div>
          <h2>Admin settings</h2>
          <p>Control registration and trigger ingestion jobs manually.</p>
        </div>
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={form.registrationEnabled}
          onChange={(event) => setForm((current) => ({ ...current, registrationEnabled: event.target.checked }))}
        />
        Enable self-registration
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={form.allowManualSync}
          onChange={(event) => setForm((current) => ({ ...current, allowManualSync: event.target.checked }))}
        />
        Allow manual sync
      </label>
      <label>
        Admin email
        <input
          type="email"
          value={form.adminEmail ?? ""}
          onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))}
        />
      </label>
      <div className="actions">
        <button type="button" onClick={save}>
          Save settings
        </button>
        <button type="button" className="button-secondary" onClick={syncNow} disabled={syncing || !form.allowManualSync}>
          {syncing ? "Syncing..." : "Run sync"}
        </button>
      </div>
      {status ? <p className="muted">{status}</p> : null}
    </section>
  );
}

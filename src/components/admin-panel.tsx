"use client";

import { useEffect, useState } from "react";

type Settings = {
  registrationEnabled: boolean;
  allowManualSync: boolean;
  adminEmail: string | null;
  enabledProviderKeys: string[];
};

type ProviderOption = {
  key: string;
  label: string;
};

type SyncSummaryItem = {
  source: string;
  stations: number;
  products: number;
};

type ManualSyncState = {
  status: string;
  progress: number;
  message: string | null;
  summary: SyncSummaryItem[];
  startedAt: string | null;
  finishedAt: string | null;
};

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function describeSyncResult(summary: SyncSummaryItem[]) {
  if (summary.length === 0) {
    return "No provider results recorded yet.";
  }

  return summary
    .map((item) => `${item.source}: ${item.stations} stations, ${item.products} products`)
    .join(" • ");
}

function syncStateTone(status: string) {
  if (status === "FAILED") {
    return "sync-state-error";
  }

  if (status === "SUCCEEDED") {
    return "sync-state-success";
  }

  return "sync-state-neutral";
}

export function AdminPanel({
  settings,
  initialManualSync,
  providerOptions
}: {
  settings: Settings;
  initialManualSync: ManualSyncState;
  providerOptions: ProviderOption[];
}) {
  const [form, setForm] = useState(settings);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualSync, setManualSync] = useState(initialManualSync);

  useEffect(() => {
    if (manualSync.status !== "RUNNING") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch("/api/admin/sync", { method: "GET", cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ManualSyncState;
        setManualSync(payload);
      } catch {
        // Keep the last known sync state visible until polling succeeds again.
      }
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [manualSync.status]);

  const startedAtLabel = formatTimestamp(manualSync.startedAt);
  const finishedAtLabel = formatTimestamp(manualSync.finishedAt);
  const progressLabel = `${Math.max(0, Math.min(100, Math.round(manualSync.progress)))}%`;
  const resultSummary = describeSyncResult(manualSync.summary);

  async function save() {
    setSaving(true);
    setStatus("Saving settings...");

    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    setStatus(response.ok ? "Settings saved." : "Failed to save settings.");
    setSaving(false);
  }

  async function syncNow() {
    setManualSync((current) => ({
      ...current,
      status: "RUNNING",
      progress: Math.max(current.progress, 1),
      message: "Requesting manual sync...",
      startedAt: current.startedAt ?? new Date().toISOString(),
      finishedAt: null
    }));

    const response = await fetch("/api/admin/sync", { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      setManualSync((current) => ({
        ...current,
        status: "FAILED",
        progress: 100,
        message: payload.error ?? "Manual sync failed.",
        finishedAt: new Date().toISOString()
      }));
      return;
    }

    setManualSync(payload);
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
      <fieldset className="stack">
        <legend>Enabled providers</legend>
        {providerOptions.map((provider) => (
          <label key={provider.key} className="checkbox">
            <input
              type="checkbox"
              checked={form.enabledProviderKeys.includes(provider.key)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  enabledProviderKeys: event.target.checked
                    ? [...current.enabledProviderKeys, provider.key]
                    : current.enabledProviderKeys.filter((key) => key !== provider.key)
                }))
              }
            />
            {provider.label}
          </label>
        ))}
      </fieldset>
      <div className="actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
        <button type="button" className="button-secondary" onClick={syncNow} disabled={manualSync.status === "RUNNING" || !form.allowManualSync}>
          {manualSync.status === "RUNNING" ? "Sync in progress..." : "Run sync"}
        </button>
      </div>
      {status ? <p className="muted">{status}</p> : null}
      <section className={`sync-state ${syncStateTone(manualSync.status)}`}>
        <div className="sync-state-header">
          <div>
            <h3>Manual sync status</h3>
            <p className="muted">
              {manualSync.status === "RUNNING"
                ? "This job keeps running on the server. You can leave this page and come back later."
                : "The latest manual sync result is saved here, even after you leave this page."}
            </p>
          </div>
          <strong>{progressLabel}</strong>
        </div>
        <div className="sync-progress" aria-hidden="true">
          <div className="sync-progress-bar" style={{ width: progressLabel }} />
        </div>
        <p>{manualSync.message ?? "Manual sync has not been started yet."}</p>
        <p className="muted">
          {startedAtLabel ? `Started ${startedAtLabel}. ` : ""}
          {finishedAtLabel ? `Last finished ${finishedAtLabel}.` : manualSync.status === "RUNNING" ? "Updates refresh automatically while this page is open." : ""}
        </p>
        <p className="muted">{resultSummary}</p>
      </section>
    </section>
  );
}

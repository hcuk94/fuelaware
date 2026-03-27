import { normalizeEnabledProviderKeys, normalizeProviderAutoSyncConfigs, normalizeProviderAutoSyncState } from "./settings";

describe("normalizeEnabledProviderKeys", () => {
  it("defaults to all providers when the stored value is not an array", () => {
    expect(normalizeEnabledProviderKeys(null)).toEqual(["uk-gov", "fr-open-data"]);
  });

  it("keeps only known provider keys and removes duplicates", () => {
    expect(normalizeEnabledProviderKeys(["fr-open-data", "unknown", "fr-open-data", "uk-gov"])).toEqual([
      "fr-open-data",
      "uk-gov"
    ]);
  });

  it("allows all providers to be disabled explicitly", () => {
    expect(normalizeEnabledProviderKeys([])).toEqual([]);
  });
});

describe("normalizeProviderAutoSyncConfigs", () => {
  it("defaults every provider to automatic sync every 60 minutes", () => {
    expect(normalizeProviderAutoSyncConfigs(null)).toEqual([
      { key: "uk-gov", enabled: true, intervalMinutes: 60 },
      { key: "fr-open-data", enabled: true, intervalMinutes: 60 }
    ]);
  });

  it("keeps known providers, rounds intervals, and backfills missing entries", () => {
    expect(
      normalizeProviderAutoSyncConfigs([
        { key: "fr-open-data", enabled: false, intervalMinutes: 15.2 },
        { key: "unknown", enabled: true, intervalMinutes: 999 }
      ])
    ).toEqual([
      { key: "uk-gov", enabled: true, intervalMinutes: 60 },
      { key: "fr-open-data", enabled: false, intervalMinutes: 15 }
    ]);
  });
});

describe("normalizeProviderAutoSyncState", () => {
  it("aligns persisted state with the current provider config", () => {
    expect(
      normalizeProviderAutoSyncState(
        [
          {
            key: "uk-gov",
            status: "SUCCEEDED",
            intervalMinutes: 5,
            lastStartedAt: "2026-01-01T00:00:00.000Z",
            lastFinishedAt: "2026-01-01T00:05:00.000Z",
            lastMessage: "ok"
          }
        ],
        [
          { key: "uk-gov", enabled: true, intervalMinutes: 30 },
          { key: "fr-open-data", enabled: false, intervalMinutes: 90 }
        ]
      )
    ).toEqual([
      {
        key: "uk-gov",
        status: "SUCCEEDED",
        intervalMinutes: 30,
        lastStartedAt: "2026-01-01T00:00:00.000Z",
        lastFinishedAt: "2026-01-01T00:05:00.000Z",
        lastMessage: "ok"
      },
      {
        key: "fr-open-data",
        status: "IDLE",
        intervalMinutes: 90,
        lastStartedAt: null,
        lastFinishedAt: null,
        lastMessage: null
      }
    ]);
  });
});

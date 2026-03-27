import "server-only";

import { prisma } from "@/lib/prisma";
import { getDataSourcesByKeys } from "@/lib/data-sources";
import { ingestLatestSnapshots } from "./ingest";
import {
  getSettings,
  normalizeProviderAutoSyncConfigs,
  normalizeProviderAutoSyncState,
  type ProviderAutoSyncConfig,
  type ProviderAutoSyncState
} from "./settings";
import { getActiveSyncOwner, runExclusiveSync } from "./sync-lock";

type AutoSyncSchedulerState = {
  intervalId: NodeJS.Timeout | null;
  runningTick: Promise<void> | null;
};

const globalForAutoSync = globalThis as typeof globalThis & {
  fuelAwareAutoSyncScheduler?: AutoSyncSchedulerState;
};

function getSchedulerState(): AutoSyncSchedulerState {
  globalForAutoSync.fuelAwareAutoSyncScheduler ??= {
    intervalId: null,
    runningTick: null
  };

  return globalForAutoSync.fuelAwareAutoSyncScheduler;
}

function parseTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isProviderDue(config: ProviderAutoSyncConfig, state: ProviderAutoSyncState) {
  if (!config.enabled) {
    return false;
  }

  const referenceTime = parseTimestamp(state.lastFinishedAt) ?? parseTimestamp(state.lastStartedAt);
  if (referenceTime === null) {
    return true;
  }

  return Date.now() - referenceTime >= config.intervalMinutes * 60_000;
}

async function saveProviderAutoSyncState(state: ProviderAutoSyncState[]) {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      providerAutoSyncState: state
    },
    create: {
      id: "singleton",
      providerAutoSyncConfigs: normalizeProviderAutoSyncConfigs(null),
      providerAutoSyncState: state
    }
  });
}

function updateProviderState(
  state: ProviderAutoSyncState[],
  key: string,
  patch: Partial<Omit<ProviderAutoSyncState, "key">>
) {
  return state.map((item) => (item.key === key ? { ...item, ...patch } : item));
}

async function runAutomaticSyncForProviders(providerKeys: string[], configByKey: Map<string, ProviderAutoSyncConfig>) {
  let providerState = normalizeProviderAutoSyncState(
    (
      await prisma.appSettings.findUnique({
        where: { id: "singleton" },
        select: { providerAutoSyncState: true }
      })
    )?.providerAutoSyncState,
    normalizeProviderAutoSyncConfigs(Array.from(configByKey.values()))
  );
  const sources = getDataSourcesByKeys(providerKeys);

  if (sources.length === 0) {
    return;
  }

  for (const source of sources) {
    const config = configByKey.get(source.key);
    if (!config) {
      continue;
    }

    const startedAt = new Date().toISOString();
    providerState = updateProviderState(providerState, source.key, {
      status: "RUNNING",
      intervalMinutes: config.intervalMinutes,
      lastStartedAt: startedAt,
      lastMessage: `Starting automatic sync for ${source.label}.`
    });
    await saveProviderAutoSyncState(providerState);

    try {
      const summary = await ingestLatestSnapshots(prisma, {
        sources: [source]
      });
      const completedAt = new Date().toISOString();
      const sourceSummary = summary[0];

      providerState = updateProviderState(providerState, source.key, {
        status: "SUCCEEDED",
        intervalMinutes: config.intervalMinutes,
        lastFinishedAt: completedAt,
        lastMessage: sourceSummary
          ? `Automatic sync complete: ${sourceSummary.stations} stations, ${sourceSummary.products} products.`
          : "Automatic sync complete."
      });
      await saveProviderAutoSyncState(providerState);
    } catch (error) {
      providerState = updateProviderState(providerState, source.key, {
        status: "FAILED",
        intervalMinutes: config.intervalMinutes,
        lastFinishedAt: new Date().toISOString(),
        lastMessage: error instanceof Error ? error.message : "Unknown automatic sync error"
      });
      await saveProviderAutoSyncState(providerState);
    }
  }
}

async function tickAutomaticSync() {
  const settings = await getSettings();
  const enabledProviderKeys = new Set(settings.enabledProviderKeys);
  const configByKey = new Map(settings.providerAutoSyncConfigs.map((config) => [config.key, config]));

  const dueProviderKeys = settings.providerAutoSyncConfigs
    .filter((config) => enabledProviderKeys.has(config.key))
    .filter((config) => {
      const state = settings.providerAutoSyncState.find((item) => item.key === config.key);
      return state ? isProviderDue(config, state) : config.enabled;
    })
    .map((config) => config.key);

  if (dueProviderKeys.length === 0) {
    return;
  }

  const started = runExclusiveSync("automatic", async () => {
    await runAutomaticSyncForProviders(dueProviderKeys, configByKey);
  });

  if (!started && getActiveSyncOwner() !== "automatic") {
    return;
  }

  await started;
}

export function ensureAutomaticSyncScheduler() {
  if (typeof window !== "undefined") {
    return;
  }

  const state = getSchedulerState();
  if (state.intervalId) {
    return;
  }

  const runTick = () => {
    if (state.runningTick) {
      return;
    }

    state.runningTick = tickAutomaticSync()
      .catch((error) => {
        console.error("Automatic sync scheduler failed.", error);
      })
      .finally(() => {
        state.runningTick = null;
      });
  };

  runTick();
  state.intervalId = setInterval(runTick, 60_000);
}

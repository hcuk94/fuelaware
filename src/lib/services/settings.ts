import { prisma } from "@/lib/prisma";
import { providerCatalog } from "@/lib/data-sources";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase();
}

const defaultEnabledProviderKeys = providerCatalog.map((provider) => provider.key);
const knownProviderKeys = new Set(defaultEnabledProviderKeys);
const defaultProviderAutoSyncConfigs = providerCatalog.map((provider) => ({
  key: provider.key,
  enabled: true,
  intervalMinutes: 60
}));

export type ProviderAutoSyncConfig = {
  key: string;
  enabled: boolean;
  intervalMinutes: number;
};

export type ProviderAutoSyncState = {
  key: string;
  status: "IDLE" | "RUNNING" | "SUCCEEDED" | "FAILED";
  intervalMinutes: number;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastMessage: string | null;
};

function normalizeIntervalMinutes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 60;
  }

  return Math.max(1, Math.round(value));
}

export function normalizeEnabledProviderKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return [...defaultEnabledProviderKeys];
  }

  const enabledProviderKeys: string[] = [];

  for (const item of value) {
    if (typeof item !== "string" || !knownProviderKeys.has(item) || enabledProviderKeys.includes(item)) {
      continue;
    }

    enabledProviderKeys.push(item);
  }

  return enabledProviderKeys;
}

export function normalizeProviderAutoSyncConfigs(value: unknown): ProviderAutoSyncConfig[] {
  const providedItems = Array.isArray(value) ? value : [];
  const providedByKey = new Map<string, ProviderAutoSyncConfig>();

  for (const item of providedItems) {
    if (!item || typeof item !== "object" || typeof item.key !== "string" || !knownProviderKeys.has(item.key)) {
      continue;
    }

    providedByKey.set(item.key, {
      key: item.key,
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
      intervalMinutes: normalizeIntervalMinutes(item.intervalMinutes)
    });
  }

  return defaultProviderAutoSyncConfigs.map((config) => providedByKey.get(config.key) ?? { ...config });
}

export function normalizeProviderAutoSyncState(
  value: unknown,
  configs: ProviderAutoSyncConfig[] = defaultProviderAutoSyncConfigs
): ProviderAutoSyncState[] {
  const providedItems = Array.isArray(value) ? value : [];
  const providedByKey = new Map<string, ProviderAutoSyncState>();

  for (const item of providedItems) {
    if (!item || typeof item !== "object" || typeof item.key !== "string" || !knownProviderKeys.has(item.key)) {
      continue;
    }

    providedByKey.set(item.key, {
      key: item.key,
      status:
        item.status === "RUNNING" || item.status === "SUCCEEDED" || item.status === "FAILED" ? item.status : "IDLE",
      intervalMinutes: normalizeIntervalMinutes(item.intervalMinutes),
      lastStartedAt: typeof item.lastStartedAt === "string" ? item.lastStartedAt : null,
      lastFinishedAt: typeof item.lastFinishedAt === "string" ? item.lastFinishedAt : null,
      lastMessage: typeof item.lastMessage === "string" ? item.lastMessage : null
    });
  }

  return configs.map((config) => {
    const state = providedByKey.get(config.key);
    return {
      key: config.key,
      status: state?.status ?? "IDLE",
      intervalMinutes: config.intervalMinutes,
      lastStartedAt: state?.lastStartedAt ?? null,
      lastFinishedAt: state?.lastFinishedAt ?? null,
      lastMessage: state?.lastMessage ?? null
    };
  });
}

export async function getSettings() {
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      registrationEnabled: (process.env.REGISTRATION_ENABLED ?? "true") === "true",
      allowManualSync: true,
      storeStationHistoryForAll: false,
      adminEmail: normalizeEmail(process.env.ADMIN_EMAIL),
      enabledProviderKeys: defaultEnabledProviderKeys,
      providerAutoSyncConfigs: defaultProviderAutoSyncConfigs,
      providerAutoSyncState: defaultProviderAutoSyncConfigs.map((config) => ({
        key: config.key,
        status: "IDLE",
        intervalMinutes: config.intervalMinutes,
        lastStartedAt: null,
        lastFinishedAt: null,
        lastMessage: null
      }))
    }
  });

  const providerAutoSyncConfigs = normalizeProviderAutoSyncConfigs(settings.providerAutoSyncConfigs);

  return {
    ...settings,
    enabledProviderKeys: normalizeEnabledProviderKeys(settings.enabledProviderKeys),
    providerAutoSyncConfigs,
    providerAutoSyncState: normalizeProviderAutoSyncState(settings.providerAutoSyncState, providerAutoSyncConfigs)
  };
}

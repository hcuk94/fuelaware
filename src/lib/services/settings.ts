import { prisma } from "@/lib/prisma";
import { providerCatalog } from "@/lib/data-sources";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase();
}

const defaultEnabledProviderKeys = providerCatalog.map((provider) => provider.key);
const knownProviderKeys = new Set(defaultEnabledProviderKeys);

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
      enabledProviderKeys: defaultEnabledProviderKeys
    }
  });

  return {
    ...settings,
    enabledProviderKeys: normalizeEnabledProviderKeys(settings.enabledProviderKeys)
  };
}

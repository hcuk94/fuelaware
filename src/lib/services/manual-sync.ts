import { prisma } from "@/lib/prisma";
import { dataSources } from "@/lib/data-sources";
import { ingestLatestSnapshots } from "./ingest";

type ManualSyncSummaryItem = {
  source: string;
  stations: number;
  products: number;
};

export type ManualSyncState = {
  status: string;
  progress: number;
  message: string | null;
  summary: ManualSyncSummaryItem[];
  startedAt: string | null;
  finishedAt: string | null;
};

let activeSync: Promise<void> | null = null;

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function parseSummary(summary: unknown): ManualSyncSummaryItem[] {
  if (!Array.isArray(summary)) {
    return [];
  }

  return summary.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.source !== "string" ||
      typeof item.stations !== "number" ||
      typeof item.products !== "number"
    ) {
      return [];
    }

    return [
      {
        source: item.source,
        stations: item.stations,
        products: item.products
      }
    ];
  });
}

export async function getManualSyncState(): Promise<ManualSyncState> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" }
  });

  return {
    status: settings?.manualSyncStatus ?? "IDLE",
    progress: clampProgress(settings?.manualSyncProgress ?? 0),
    message: settings?.manualSyncMessage ?? null,
    summary: parseSummary(settings?.manualSyncSummary),
    startedAt: settings?.manualSyncStartedAt?.toISOString() ?? null,
    finishedAt: settings?.manualSyncFinishedAt?.toISOString() ?? null
  };
}

async function updateManualSyncState(state: {
  status: string;
  progress: number;
  message: string;
  summary?: ManualSyncSummaryItem[];
  startedAt?: Date | null;
  finishedAt?: Date | null;
}) {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      manualSyncStatus: state.status,
      manualSyncProgress: clampProgress(state.progress),
      manualSyncMessage: state.message,
      manualSyncSummary: state.summary,
      manualSyncStartedAt: state.startedAt,
      manualSyncFinishedAt: state.finishedAt
    },
    create: {
      id: "singleton",
      manualSyncStatus: state.status,
      manualSyncProgress: clampProgress(state.progress),
      manualSyncMessage: state.message,
      manualSyncSummary: state.summary,
      manualSyncStartedAt: state.startedAt,
      manualSyncFinishedAt: state.finishedAt
    }
  });
}

async function runManualSync() {
  const startedAt = new Date();

  await updateManualSyncState({
    status: "RUNNING",
    progress: 2,
    message: "Starting manual sync.",
    summary: [],
    startedAt,
    finishedAt: null
  });

  const totalSources = Math.max(1, dataSources.length);
  const sourceWeight = 100 / totalSources;

  try {
    const summary = await ingestLatestSnapshots(prisma, {
      onProgress: async (progress) => {
        if (progress.phase === "fetching") {
          await updateManualSyncState({
            status: "RUNNING",
            progress: progress.sourceIndex * sourceWeight + sourceWeight * 0.08,
            message: `Fetching ${progress.source} data.`,
            startedAt,
            finishedAt: null
          });
          return;
        }

        if (progress.phase === "processing") {
          const sourceOffset = progress.sourceIndex * sourceWeight;
          const stationProgress = progress.stationCount === 0 ? 0.75 : ((progress.stationIndex + 1) / progress.stationCount) * 0.75;
          await updateManualSyncState({
            status: "RUNNING",
            progress: sourceOffset + sourceWeight * 0.15 + stationProgress * sourceWeight,
            message: `Processing ${progress.source} stations (${progress.stationIndex + 1}/${progress.stationCount}).`,
            startedAt,
            finishedAt: null
          });
          return;
        }

        await updateManualSyncState({
          status: "RUNNING",
          progress: (progress.sourceIndex + 1) * sourceWeight,
          message: `Finished ${progress.source}.`,
          startedAt,
          finishedAt: null
        });
      }
    });

    await updateManualSyncState({
      status: "SUCCEEDED",
      progress: 100,
      message: "Manual sync complete.",
      summary,
      startedAt,
      finishedAt: new Date()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";

    await updateManualSyncState({
      status: "FAILED",
      progress: 100,
      message: `Manual sync failed: ${message}`,
      startedAt,
      finishedAt: new Date()
    });
  }
}

export async function startManualSync() {
  const currentState = await getManualSyncState();
  if (currentState.status === "RUNNING" && activeSync) {
    return currentState;
  }

  activeSync = runManualSync().finally(() => {
    activeSync = null;
  });

  return getManualSyncState();
}

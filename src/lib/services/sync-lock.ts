import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

const LEASE_ID = "singleton";
const LEASE_DURATION_MS = 30 * 60_000;

type SyncLockState = {
  activeOwner: string | null;
  activePromise: Promise<void> | null;
  acquiring: boolean;
};

const globalForSyncLock = globalThis as typeof globalThis & {
  fuelAwareSyncLock?: SyncLockState;
};

function getSyncLockState(): SyncLockState {
  globalForSyncLock.fuelAwareSyncLock ??= {
    activeOwner: null,
    activePromise: null,
    acquiring: false
  };

  return globalForSyncLock.fuelAwareSyncLock;
}

export function getActiveSyncOwner() {
  return getSyncLockState().activeOwner;
}

export function isSyncRunning() {
  const state = getSyncLockState();
  return state.acquiring || state.activePromise !== null;
}

async function acquireSharedLease(owner: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  const claimed = await prisma.appSettings.updateMany({
    where: {
      id: LEASE_ID,
      OR: [{ syncLeaseExpiresAt: null }, { syncLeaseExpiresAt: { lt: now } }]
    },
    data: {
      syncLeaseOwner: owner,
      syncLeaseExpiresAt: expiresAt
    }
  });

  return claimed.count === 1;
}

async function releaseSharedLease(owner: string) {
  await prisma.appSettings.updateMany({
    where: { id: LEASE_ID, syncLeaseOwner: owner },
    data: { syncLeaseOwner: null, syncLeaseExpiresAt: null }
  });
}

export async function runExclusiveSync(owner: string, task: () => Promise<void>) {
  const state = getSyncLockState();
  if (state.acquiring || state.activePromise) {
    return null;
  }

  state.acquiring = true;
  state.activeOwner = owner;
  const leaseOwner = `${owner}:${process.pid}:${randomUUID()}`;

  try {
    if (!(await acquireSharedLease(leaseOwner))) {
      state.activeOwner = null;
      return null;
    }

    const activePromise = Promise.resolve()
      .then(task)
      .finally(async () => {
        try {
          await releaseSharedLease(leaseOwner);
        } finally {
          if (state.activePromise === activePromise) {
            state.activeOwner = null;
            state.activePromise = null;
          }
        }
      });

    state.activePromise = activePromise;
    return activePromise;
  } finally {
    state.acquiring = false;
  }
}

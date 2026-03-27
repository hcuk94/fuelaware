type SyncLockState = {
  activeOwner: string | null;
  activePromise: Promise<void> | null;
};

const globalForSyncLock = globalThis as typeof globalThis & {
  fuelAwareSyncLock?: SyncLockState;
};

function getSyncLockState(): SyncLockState {
  globalForSyncLock.fuelAwareSyncLock ??= {
    activeOwner: null,
    activePromise: null
  };

  return globalForSyncLock.fuelAwareSyncLock;
}

export function getActiveSyncOwner() {
  return getSyncLockState().activeOwner;
}

export function isSyncRunning() {
  return getSyncLockState().activePromise !== null;
}

export function runExclusiveSync(owner: string, task: () => Promise<void>) {
  const state = getSyncLockState();
  if (state.activePromise) {
    return null;
  }

  const activePromise = task().finally(() => {
    if (state.activePromise === activePromise) {
      state.activeOwner = null;
      state.activePromise = null;
    }
  });

  state.activeOwner = owner;
  state.activePromise = activePromise;
  return activePromise;
}

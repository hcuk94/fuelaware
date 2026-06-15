type SnapshotPoint = {
  observedAt: Date;
  price: unknown;
};

export function normalizeSnapshotSeries(
  snapshots: SnapshotPoint[],
  limit = 120
): Array<{ observedAt: string; price: number }> {
  const snapshotsDescending = [...snapshots].sort(
    (left, right) => right.observedAt.getTime() - left.observedAt.getTime()
  );
  const dedupedDescending = new Map<string, number>();

  for (const snapshot of snapshotsDescending) {
    const observedAt = snapshot.observedAt.toISOString();
    if (dedupedDescending.has(observedAt)) {
      continue;
    }

    dedupedDescending.set(observedAt, Number(snapshot.price));
    if (dedupedDescending.size >= limit) {
      break;
    }
  }

  return Array.from(dedupedDescending.entries())
    .reverse()
    .map(([observedAt, price]) => ({ observedAt, price }));
}

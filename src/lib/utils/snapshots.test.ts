import { normalizeSnapshotSeries } from "./snapshots";

describe("normalizeSnapshotSeries", () => {
  it("deduplicates repeated timestamps and keeps the newest unique points", () => {
    const result = normalizeSnapshotSeries([
      { observedAt: new Date("2026-03-20T10:00:00Z"), price: 1.579 },
      { observedAt: new Date("2026-03-20T10:00:00Z"), price: 1.579 },
      { observedAt: new Date("2026-03-20T10:00:00Z"), price: 1.579 },
      { observedAt: new Date("2026-06-15T10:47:30Z"), price: 1.559 }
    ]);

    expect(result).toEqual([
      { observedAt: "2026-03-20T10:00:00.000Z", price: 1.579 },
      { observedAt: "2026-06-15T10:47:30.000Z", price: 1.559 }
    ]);
  });

  it("limits the series after counting unique timestamps", () => {
    const result = normalizeSnapshotSeries(
      [
        { observedAt: new Date("2026-03-20T10:00:00Z"), price: 1.579 },
        { observedAt: new Date("2026-03-20T10:00:00Z"), price: 1.579 },
        { observedAt: new Date("2026-03-21T10:00:00Z"), price: 1.569 },
        { observedAt: new Date("2026-03-22T10:00:00Z"), price: 1.559 }
      ],
      2
    );

    expect(result).toEqual([
      { observedAt: "2026-03-21T10:00:00.000Z", price: 1.569 },
      { observedAt: "2026-03-22T10:00:00.000Z", price: 1.559 }
    ]);
  });
});

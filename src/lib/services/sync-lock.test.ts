const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appSettings: {
      updateMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

import { isSyncRunning, runExclusiveSync } from "./sync-lock";

describe("runExclusiveSync", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not run a task when another process holds the database lease", async () => {
    prismaMock.appSettings.updateMany.mockResolvedValueOnce({ count: 0 });
    const task = vi.fn();

    await expect(runExclusiveSync("automatic", task)).resolves.toBeNull();

    expect(task).not.toHaveBeenCalled();
    expect(isSyncRunning()).toBe(false);
  });

  it("releases its database lease after a task completes", async () => {
    prismaMock.appSettings.updateMany.mockResolvedValue({ count: 1 });
    const task = vi.fn().mockResolvedValue(undefined);

    const started = await runExclusiveSync("automatic", task);
    await started;

    expect(task).toHaveBeenCalledOnce();
    expect(prismaMock.appSettings.updateMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.appSettings.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ syncLeaseExpiresAt: expect.any(Date) })
      })
    );
    expect(prismaMock.appSettings.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: { syncLeaseOwner: null, syncLeaseExpiresAt: null }
      })
    );
    expect(isSyncRunning()).toBe(false);
  });
});

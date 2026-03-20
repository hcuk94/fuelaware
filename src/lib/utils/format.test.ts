import { formatDate, formatPrice } from "./format";

describe("format helpers", () => {
  it("formats currency and unit together", () => {
    expect(formatPrice(1.529, "GBP", "L")).toContain("£1.529/L");
  });

  it("formats dates in a human-readable en-GB format", () => {
    expect(formatDate("2026-03-20T15:00:00.000Z")).toContain("20 Mar 2026");
  });
});

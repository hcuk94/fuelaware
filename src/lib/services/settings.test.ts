import { normalizeEnabledProviderKeys } from "./settings";

describe("normalizeEnabledProviderKeys", () => {
  it("defaults to all providers when the stored value is not an array", () => {
    expect(normalizeEnabledProviderKeys(null)).toEqual(["uk-gov", "fr-open-data"]);
  });

  it("keeps only known provider keys and removes duplicates", () => {
    expect(normalizeEnabledProviderKeys(["fr-open-data", "unknown", "fr-open-data", "uk-gov"])).toEqual([
      "fr-open-data",
      "uk-gov"
    ]);
  });

  it("allows all providers to be disabled explicitly", () => {
    expect(normalizeEnabledProviderKeys([])).toEqual([]);
  });
});

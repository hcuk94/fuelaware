import { distanceKm } from "./distance";

describe("distanceKm", () => {
  it("returns zero for identical coordinates", () => {
    expect(distanceKm(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 6);
  });

  it("calculates a realistic distance between London and Paris", () => {
    expect(distanceKm(51.5074, -0.1278, 48.8566, 2.3522)).toBeCloseTo(344, 0);
  });
});

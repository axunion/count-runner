import { describe, expect, it } from "vitest";
import { computeScore } from "./score.ts";

describe("computeScore", () => {
  it("weights remaining units and max combo (150 units, combo 12)", () => {
    expect(computeScore(150, 12)).toBe(150 * 10 + 12 * 30);
  });

  it("returns 0 when both units and combo are 0", () => {
    expect(computeScore(0, 0)).toBe(0);
  });
});

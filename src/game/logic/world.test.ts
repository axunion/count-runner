import { describe, expect, it } from "vitest";
import { scrollSpeedAt } from "./world.ts";

describe("scrollSpeedAt", () => {
  it("returns SCROLL_SPEED_BASE at distance 0", () => {
    expect(scrollSpeedAt(0)).toBe(170);
  });

  it("returns SCROLL_SPEED_MAX at GOAL_DISTANCE (4600)", () => {
    expect(scrollSpeedAt(4600)).toBe(250);
  });

  it("linearly interpolates at the midpoint", () => {
    expect(scrollSpeedAt(2300)).toBe(210);
  });

  it("clamps to SCROLL_SPEED_MAX beyond GOAL_DISTANCE", () => {
    expect(scrollSpeedAt(8000)).toBe(250);
  });
});

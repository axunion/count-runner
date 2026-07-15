import { describe, expect, it } from "vitest";
import { scrollSpeedAt } from "./world.ts";

describe("scrollSpeedAt", () => {
  it("returns SCROLL_SPEED_BASE at distance 0", () => {
    expect(scrollSpeedAt(0)).toBe(180);
  });

  it("returns SCROLL_SPEED_MAX at GOAL_DISTANCE (6000)", () => {
    expect(scrollSpeedAt(6000)).toBe(230);
  });

  it("linearly interpolates at the midpoint", () => {
    expect(scrollSpeedAt(3000)).toBe(205);
  });

  it("clamps to SCROLL_SPEED_MAX beyond GOAL_DISTANCE", () => {
    expect(scrollSpeedAt(8000)).toBe(230);
  });
});

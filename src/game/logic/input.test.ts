import { describe, expect, it } from "vitest";
import {
  KEYBOARD_MOVE_SPEED,
  LEADER_CLAMP_MARGIN,
  VIEW_W,
} from "../constants.ts";
import { keyboardDir, nextTargetX } from "./input.ts";

describe("keyboardDir", () => {
  it("returns 0 when no key is held", () => {
    expect(keyboardDir(false, false)).toBe(0);
  });

  it("returns 0 when both keys are held", () => {
    expect(keyboardDir(true, true)).toBe(0);
  });

  it("returns -1 for left and 1 for right", () => {
    expect(keyboardDir(true, false)).toBe(-1);
    expect(keyboardDir(false, true)).toBe(1);
  });
});

describe("nextTargetX", () => {
  it("moves proportionally to dt", () => {
    expect(nextTargetX(180, 1, 0.1)).toBeCloseTo(
      180 + KEYBOARD_MOVE_SPEED * 0.1,
    );
    expect(nextTargetX(180, -1, 0.05)).toBeCloseTo(
      180 - KEYBOARD_MOVE_SPEED * 0.05,
    );
  });

  it("does not move when dir is 0", () => {
    expect(nextTargetX(180, 0, 0.5)).toBe(180);
  });

  it("clamps at the left margin", () => {
    expect(nextTargetX(LEADER_CLAMP_MARGIN + 1, -1, 1)).toBe(
      LEADER_CLAMP_MARGIN,
    );
  });

  it("clamps at the right margin", () => {
    expect(nextTargetX(VIEW_W - LEADER_CLAMP_MARGIN - 1, 1, 1)).toBe(
      VIEW_W - LEADER_CLAMP_MARGIN,
    );
  });
});

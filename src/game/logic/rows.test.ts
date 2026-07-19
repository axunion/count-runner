import { describe, expect, it } from "vitest";
import {
  FAST_ROW_SPEED_MULT,
  GATE_ASYM_OFFSET,
  GATE_BOUNDARY_DEFAULT,
  GATE_BOUNDARY_MAX,
  GATE_BOUNDARY_MIN,
  GATE_OSC_AMP_MAX,
  GATE_OSC_AMP_MIN,
  GATE_OSC_PERIOD_MAX,
  GATE_OSC_PERIOD_MIN,
  LANE_MARGIN,
  ROW_BREATHER_MULT,
  ROW_CLUSTER_GAP,
  ROW_GAP_BASE,
  ROW_GAP_JITTER,
  VIEW_W,
} from "../constants.ts";
import {
  boundaryXAt,
  cellRects,
  narrowSide,
  rollRowGap,
  rollRowMods,
} from "./rows.ts";
import type { GateCell } from "./types.ts";

function cell(kind: GateCell["kind"], value: number): GateCell {
  return { kind, value, displayValue: `${value}` };
}

describe("boundaryXAt", () => {
  it("returns boundaryX unchanged without oscillation", () => {
    expect(boundaryXAt({ boundaryX: 180 }, 12.3)).toBe(180);
  });

  it("applies the sine offset at a known time", () => {
    const row = {
      boundaryX: 180,
      oscillation: { amp: 40, period: 2, phase: 0 },
    };
    // elapsed = period / 4 -> sin(pi/2) = 1 -> full amplitude
    expect(boundaryXAt(row, 0.5)).toBeCloseTo(220);
    expect(boundaryXAt(row, 0)).toBeCloseTo(180);
  });

  it("clamps to the boundary range at both ends", () => {
    const wide = { amp: 200, period: 2, phase: 0 };
    expect(boundaryXAt({ boundaryX: 180, oscillation: wide }, 0.5)).toBe(
      GATE_BOUNDARY_MAX,
    );
    expect(boundaryXAt({ boundaryX: 180, oscillation: wide }, 1.5)).toBe(
      GATE_BOUNDARY_MIN,
    );
  });
});

describe("cellRects", () => {
  it("reproduces the symmetric v2 layout at the default boundary (12/164/184/164)", () => {
    const rects = cellRects(GATE_BOUNDARY_DEFAULT);
    expect(rects.left).toEqual({ x: 12, width: 164 });
    expect(rects.right).toEqual({ x: 184, width: 164 });
  });

  it("keeps both cells at least 76px wide across the whole clamp range", () => {
    for (let b = GATE_BOUNDARY_MIN; b <= GATE_BOUNDARY_MAX; b++) {
      const rects = cellRects(b);
      expect(rects.left.width).toBeGreaterThanOrEqual(76);
      expect(rects.right.width).toBeGreaterThanOrEqual(76);
    }
  });

  it("tiles the lane exactly: margins + widths + gap = VIEW_W", () => {
    const rects = cellRects(130);
    expect(LANE_MARGIN * 2 + rects.left.width + rects.right.width + 8).toBe(
      VIEW_W,
    );
  });
});

describe("narrowSide", () => {
  it("ranks multiply > add > subtract", () => {
    expect(narrowSide(cell("multiply", 2), cell("add", 5))).toBe("left");
    expect(narrowSide(cell("subtract", 3), cell("add", 5))).toBe("right");
    expect(narrowSide(cell("subtract", 2), cell("multiply", 2))).toBe("right");
  });

  it("picks the smaller loss on danger rows", () => {
    expect(narrowSide(cell("subtract", 2), cell("subtract", 6))).toBe("left");
    expect(narrowSide(cell("subtract", 5), cell("subtract", 1))).toBe("right");
  });

  it("returns undefined for equal-value danger rows", () => {
    expect(narrowSide(cell("subtract", 3), cell("subtract", 3))).toBe(
      undefined,
    );
  });
});

describe("rollRowMods", () => {
  const left = cell("multiply", 2);
  const right = cell("add", 5);

  it("is always symmetric, static and normal speed in phase 1", () => {
    for (const roll of [0, 0.01, 0.5, 0.99]) {
      const mods = rollRowMods(left, right, 0, () => roll);
      expect(mods).toEqual({
        boundaryX: GATE_BOUNDARY_DEFAULT,
        speedMult: 1,
      });
    }
  });

  it("shifts the boundary toward the better side from phase 2 on", () => {
    const mods = rollRowMods(left, right, 2000, () => 0.99);
    expect(mods.boundaryX).toBe(GATE_BOUNDARY_DEFAULT - GATE_ASYM_OFFSET);
    const flipped = rollRowMods(right, left, 2000, () => 0.99);
    expect(flipped.boundaryX).toBe(GATE_BOUNDARY_DEFAULT + GATE_ASYM_OFFSET);
  });

  it("rolls oscillation params within their ranges when the rate hits", () => {
    // phase2 oscillation rate is 0.15; first rng call decides
    const mods = rollRowMods(left, right, 2000, () => 0.1);
    expect(mods.oscillation).toBeDefined();
    const osc = mods.oscillation;
    if (!osc) throw new Error("unreachable");
    expect(osc.amp).toBeGreaterThanOrEqual(GATE_OSC_AMP_MIN);
    expect(osc.amp).toBeLessThanOrEqual(GATE_OSC_AMP_MAX);
    expect(osc.period).toBeGreaterThanOrEqual(GATE_OSC_PERIOD_MIN);
    expect(osc.period).toBeLessThanOrEqual(GATE_OSC_PERIOD_MAX);
  });

  it("never rolls fast rows before phase 3, and rolls them at the phase 3 rate", () => {
    expect(rollRowMods(left, right, 2000, () => 0.19).speedMult).toBe(1);
    // phase3: rng calls are oscillation roll (0.5 -> no osc) then fast roll
    const rolls = [0.5, 0.1];
    const fast = rollRowMods(left, right, 4000, () => rolls.shift() ?? 0);
    expect(fast.speedMult).toBe(FAST_ROW_SPEED_MULT);
    const slowRolls = [0.5, 0.5];
    const slow = rollRowMods(left, right, 4000, () => slowRolls.shift() ?? 0);
    expect(slow.speedMult).toBe(1);
  });
});

describe("rollRowGap", () => {
  it("stays within base ± jitter in phase 1 (no cluster/breather)", () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      const gap = rollRowGap(0, () => roll);
      expect(gap).toBeGreaterThanOrEqual(ROW_GAP_BASE.phase1 - ROW_GAP_JITTER);
      expect(gap).toBeLessThanOrEqual(ROW_GAP_BASE.phase1 + ROW_GAP_JITTER);
    }
  });

  it("returns the cluster gap when the cluster roll hits (phase 2+)", () => {
    expect(rollRowGap(2000, () => 0.1)).toBe(ROW_CLUSTER_GAP);
  });

  it("returns the breather gap when the breather roll hits (phase 2+)", () => {
    expect(rollRowGap(2000, () => 0.2)).toBe(
      ROW_GAP_BASE.phase2 * ROW_BREATHER_MULT,
    );
  });

  it("falls back to base ± jitter past both rates (phase 2+)", () => {
    const rolls = [0.9, 0.5];
    const gap = rollRowGap(2000, () => rolls.shift() ?? 0);
    expect(gap).toBe(ROW_GAP_BASE.phase2);
  });
});

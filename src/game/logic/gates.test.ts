import { describe, expect, it } from "vitest";
import {
  applyGate,
  betterSide,
  rollGateValue,
  rollRowPattern,
} from "./gates.ts";

describe("applyGate", () => {
  it("adds", () => {
    expect(applyGate("add", 5, 10)).toBe(15);
  });

  it("multiplies", () => {
    expect(applyGate("multiply", 2, 10)).toBe(20);
  });

  it("subtracts", () => {
    expect(applyGate("subtract", 3, 10)).toBe(7);
  });

  it("floors subtract at zero", () => {
    expect(applyGate("subtract", 3, 2)).toBe(0);
  });

  it("caps add at MAX_UNITS (300)", () => {
    expect(applyGate("add", 5, 298)).toBe(300);
  });

  it("caps multiply at MAX_UNITS (300)", () => {
    expect(applyGate("multiply", 2, 200)).toBe(300);
  });
});

describe("rollRowPattern", () => {
  const isDanger = (pattern: { a: string; b: string; guarded: boolean }) =>
    pattern.a === "subtract" && pattern.b === "subtract";
  const allowedPhase1 = [
    { a: "add", b: "subtract", guarded: false },
    { a: "multiply", b: "subtract", guarded: false },
    { a: "multiply", b: "add", guarded: false },
  ];

  it("Phase 1 never rolls danger or guarded rows and stays within the allowed set", () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.99]) {
      const pattern = rollRowPattern(0, () => roll);
      expect(isDanger(pattern)).toBe(false);
      expect(pattern.guarded).toBe(false);
      expect(allowedPhase1).toContainEqual(pattern);
    }
  });

  it("Phase 2 switches pattern exactly at the rate-table boundaries (30/20/30/10/10)", () => {
    const distance = 2500;
    expect(rollRowPattern(distance, () => 0)).toEqual({
      a: "add",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.29)).toEqual({
      a: "add",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.3)).toEqual({
      a: "multiply",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.49)).toEqual({
      a: "multiply",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.5)).toEqual({
      a: "multiply",
      b: "add",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.79)).toEqual({
      a: "multiply",
      b: "add",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.8)).toEqual({
      a: "subtract",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.89)).toEqual({
      a: "subtract",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.9)).toEqual({
      a: "multiply",
      b: "add",
      guarded: true,
    });
    expect(rollRowPattern(distance, () => 0.99)).toEqual({
      a: "multiply",
      b: "add",
      guarded: true,
    });
  });

  it("Phase 3 switches pattern exactly at the rate-table boundaries (20/15/25/20/20)", () => {
    const distance = 4500;
    expect(rollRowPattern(distance, () => 0)).toEqual({
      a: "add",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.19)).toEqual({
      a: "add",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.2)).toEqual({
      a: "multiply",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.34)).toEqual({
      a: "multiply",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.35)).toEqual({
      a: "multiply",
      b: "add",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.59)).toEqual({
      a: "multiply",
      b: "add",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.6)).toEqual({
      a: "subtract",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.79)).toEqual({
      a: "subtract",
      b: "subtract",
      guarded: false,
    });
    expect(rollRowPattern(distance, () => 0.8)).toEqual({
      a: "multiply",
      b: "add",
      guarded: true,
    });
    expect(rollRowPattern(distance, () => 0.99)).toEqual({
      a: "multiply",
      b: "add",
      guarded: true,
    });
  });

  it("is deterministic for the same distance and rng", () => {
    const rng = () => 0.5;
    expect(rollRowPattern(1234, rng)).toEqual(rollRowPattern(1234, rng));
  });
});

describe("rollGateValue", () => {
  const rolls = Array.from({ length: 100 }, (_, i) => i / 100);

  it("stays within the Phase 1 add range [4, 6] and reaches both ends", () => {
    const values = rolls.map((roll) => rollGateValue("add", 0, () => roll));
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(4);
      expect(value).toBeLessThanOrEqual(6);
    }
    expect(values).toContain(4);
    expect(values).toContain(6);
  });

  it("stays within the Phase 2 add range [3, 8] and reaches both ends", () => {
    const values = rolls.map((roll) => rollGateValue("add", 2500, () => roll));
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(8);
    }
    expect(values).toContain(3);
    expect(values).toContain(8);
  });

  it("stays within the Phase 3 add range [3, 10] and reaches both ends", () => {
    const values = rolls.map((roll) => rollGateValue("add", 4500, () => roll));
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(10);
    }
    expect(values).toContain(3);
    expect(values).toContain(10);
  });

  it("stays within the Phase 1 subtract range [2, 3] and reaches both ends", () => {
    const values = rolls.map((roll) =>
      rollGateValue("subtract", 0, () => roll),
    );
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(3);
    }
    expect(values).toContain(2);
    expect(values).toContain(3);
  });

  it("stays within the Phase 2 subtract range [2, 6] and reaches both ends", () => {
    const values = rolls.map((roll) =>
      rollGateValue("subtract", 2500, () => roll),
    );
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(6);
    }
    expect(values).toContain(2);
    expect(values).toContain(6);
  });

  it("stays within the Phase 3 subtract range [3, 8] and reaches both ends", () => {
    const values = rolls.map((roll) =>
      rollGateValue("subtract", 4500, () => roll),
    );
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(8);
    }
    expect(values).toContain(3);
    expect(values).toContain(8);
  });

  it("never rolls x3 in Phase 1 (x3 rate is 0%)", () => {
    for (const roll of rolls) {
      expect(rollGateValue("multiply", 0, () => roll)).toBe(2);
    }
  });

  it("switches x2/x3 exactly at the Phase 2 rate boundary (10%)", () => {
    expect(rollGateValue("multiply", 2500, () => 0.89)).toBe(2);
    expect(rollGateValue("multiply", 2500, () => 0.9)).toBe(3);
  });

  it("switches x2/x3 exactly at the Phase 3 rate boundary (15%)", () => {
    expect(rollGateValue("multiply", 4500, () => 0.84)).toBe(2);
    expect(rollGateValue("multiply", 4500, () => 0.85)).toBe(3);
  });

  it("is deterministic for the same kind, distance and rng", () => {
    const rng = () => 0.42;
    expect(rollGateValue("add", 3000, rng)).toBe(
      rollGateValue("add", 3000, rng),
    );
  });
});

describe("betterSide", () => {
  it("flips the better side depending on the current count (+7 vs x2)", () => {
    const row = {
      left: { kind: "add" as const, value: 7, displayValue: "+7" },
      right: { kind: "multiply" as const, value: 2, displayValue: "x2" },
    };
    // count 6: left -> 13, right -> 12
    expect(betterSide(row, 6)).toBe("left");
    // count 8: left -> 15, right -> 16
    expect(betterSide(row, 8)).toBe("right");
  });

  it("returns tie when both sides produce the same result", () => {
    const row = {
      left: { kind: "add" as const, value: 5, displayValue: "+5" },
      right: { kind: "add" as const, value: 5, displayValue: "+5" },
    };
    expect(betterSide(row, 10)).toBe("tie");
  });

  it("weighs the guarded toll into the comparison and flips with count (guard 40 + x2 vs +6)", () => {
    const row = {
      left: {
        kind: "multiply" as const,
        value: 2,
        displayValue: "x2",
        guard: 40,
      },
      right: { kind: "add" as const, value: 6, displayValue: "+6" },
    };
    // count 100: left -> (100-40)*2 = 120, right -> 106
    expect(betterSide(row, 100)).toBe("left");
    // count 50: left -> (50-40)*2 = 20, right -> 56
    expect(betterSide(row, 50)).toBe("right");
  });

  it("never treats a wipeout guarded side (guard >= count) as the better side", () => {
    const row = {
      left: {
        kind: "multiply" as const,
        value: 2,
        displayValue: "x2",
        guard: 100,
      },
      right: { kind: "add" as const, value: 5, displayValue: "+5" },
    };
    expect(betterSide(row, 80)).toBe("right");
  });
});

import { describe, expect, it } from "vitest";
import {
  applyGate,
  formationOffset,
  rollRowPattern,
} from "./GamePrototype.tsx";

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

describe("formationOffset", () => {
  it("places index 0 at the origin", () => {
    expect(formationOffset(0)).toEqual({ x: 0, y: 0 });
  });

  it("never overlaps two units among indices 1..50", () => {
    const offsets = Array.from({ length: 50 }, (_, i) =>
      formationOffset(i + 1),
    );
    for (let a = 0; a < offsets.length; a++) {
      for (let b = a + 1; b < offsets.length; b++) {
        const same =
          offsets[a].x === offsets[b].x && offsets[a].y === offsets[b].y;
        expect(same).toBe(false);
      }
    }
  });

  it("keeps every index >= 1 on the SPACING*sqrt(i) ellipse (0.75 squashed)", () => {
    const SPACING = 7;
    for (let i = 1; i <= 50; i++) {
      const { x, y } = formationOffset(i);
      const radius = Math.sqrt(x * x + (y / 0.75) * (y / 0.75));
      expect(radius).toBeCloseTo(SPACING * Math.sqrt(i), 5);
    }
  });
});

describe("rollRowPattern", () => {
  const isDanger = (pattern: { a: string; b: string }) =>
    pattern.a === "subtract" && pattern.b === "subtract";
  const allowedPhase1 = [
    { a: "add", b: "subtract" },
    { a: "multiply", b: "subtract" },
    { a: "multiply", b: "add" },
  ];

  it("Phase 1 never rolls a danger row and stays within the allowed set", () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.99]) {
      const pattern = rollRowPattern(0, () => roll);
      expect(isDanger(pattern)).toBe(false);
      expect(allowedPhase1).toContainEqual(pattern);
    }
  });

  it("Phase 2 switches pattern exactly at the rate-table boundaries", () => {
    const distance = 2500;
    expect(rollRowPattern(distance, () => 0)).toEqual({
      a: "add",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.34)).toEqual({
      a: "add",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.36)).toEqual({
      a: "multiply",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.59)).toEqual({
      a: "multiply",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.61)).toEqual({
      a: "multiply",
      b: "add",
    });
    expect(rollRowPattern(distance, () => 0.89)).toEqual({
      a: "multiply",
      b: "add",
    });
    expect(rollRowPattern(distance, () => 0.91)).toEqual({
      a: "subtract",
      b: "subtract",
    });
  });

  it("Phase 3 switches pattern exactly at the rate-table boundaries", () => {
    const distance = 4500;
    expect(rollRowPattern(distance, () => 0)).toEqual({
      a: "add",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.24)).toEqual({
      a: "add",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.26)).toEqual({
      a: "multiply",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.44)).toEqual({
      a: "multiply",
      b: "subtract",
    });
    expect(rollRowPattern(distance, () => 0.46)).toEqual({
      a: "multiply",
      b: "add",
    });
    expect(rollRowPattern(distance, () => 0.69)).toEqual({
      a: "multiply",
      b: "add",
    });
    expect(rollRowPattern(distance, () => 0.71)).toEqual({
      a: "subtract",
      b: "subtract",
    });
  });

  it("is deterministic for the same distance and rng", () => {
    const rng = () => 0.5;
    expect(rollRowPattern(1234, rng)).toEqual(rollRowPattern(1234, rng));
  });
});

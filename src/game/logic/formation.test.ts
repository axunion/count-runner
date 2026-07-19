import { describe, expect, it } from "vitest";
import { formationOffset } from "./formation.ts";

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
    const SPACING = 12;
    for (let i = 1; i <= 50; i++) {
      const { x, y } = formationOffset(i);
      const radius = Math.sqrt(x * x + (y / 0.75) * (y / 0.75));
      expect(radius).toBeCloseTo(SPACING * Math.sqrt(i), 5);
    }
  });
});

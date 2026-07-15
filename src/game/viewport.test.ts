import { describe, expect, it } from "vitest";
import { computeViewport } from "./viewport.ts";

function isContained(
  vw: number,
  vh: number,
  viewW: number,
  viewH: number,
  scale: number,
) {
  const epsilon = 1e-9;
  return viewW * scale <= vw + epsilon && viewH * scale <= vh + epsilon;
}

describe("computeViewport", () => {
  it("clamps to VIEW_H_MIN (640) for wide/short viewports (ratio < 1.78)", () => {
    const { viewW, viewH, scale } = computeViewport(1920, 1080);
    expect(viewW).toBe(360);
    expect(viewH).toBe(640);
    expect(isContained(1920, 1080, viewW, viewH, scale)).toBe(true);
  });

  it("fits an iPhone-like viewport (ratio ~2.17) without clamping", () => {
    const vw = 393;
    const vh = 852;
    const { viewW, viewH, scale } = computeViewport(vw, vh);
    expect(viewW).toBe(360);
    expect(viewH).toBeCloseTo(780, 0);
    expect(isContained(vw, vh, viewW, viewH, scale)).toBe(true);
  });

  it("clamps to VIEW_H_MAX (900) for very tall viewports (ratio > 2.5)", () => {
    const { viewW, viewH, scale } = computeViewport(360, 1000);
    expect(viewW).toBe(360);
    expect(viewH).toBe(900);
    expect(isContained(360, 1000, viewW, viewH, scale)).toBe(true);
  });

  it("exercises the exact VIEW_H_MIN boundary (ratio 1.7778)", () => {
    const { viewH } = computeViewport(360, 640);
    expect(viewH).toBe(640);
  });

  it("exercises the exact VIEW_H_MAX boundary (ratio 2.5)", () => {
    const { viewH } = computeViewport(360, 900);
    expect(viewH).toBe(900);
  });

  it("keeps scale as the contain factor (min of width- and height-based scale)", () => {
    const { viewW, viewH, scale } = computeViewport(1920, 1080);
    const expected = Math.min(1080 / viewH, 1920 / viewW);
    expect(scale).toBeCloseTo(expected, 10);
  });
});

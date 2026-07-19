import { describe, expect, it } from "vitest";
import {
  RESOLVE_CHOSEN_HOLD,
  RESOLVE_RING_LIFETIME,
  RESOLVE_UNCHOSEN_FADE,
} from "../constants.ts";
import { resolveFeedback } from "./feedback.ts";

describe("resolveFeedback", () => {
  it("holds the chosen cell at peak alpha during the hold window", () => {
    expect(resolveFeedback(true, 0).alpha).toBe(0.95);
    expect(resolveFeedback(true, RESOLVE_CHOSEN_HOLD - 0.01).alpha).toBe(0.95);
  });

  it("eases the chosen cell down to its rest alpha after the hold", () => {
    expect(resolveFeedback(true, RESOLVE_CHOSEN_HOLD + 1).alpha).toBeCloseTo(
      0.4,
    );
  });

  it("fades the ring out over its lifetime", () => {
    expect(resolveFeedback(true, 0).ringAlpha).toBe(1);
    expect(
      resolveFeedback(true, RESOLVE_RING_LIFETIME / 2).ringAlpha,
    ).toBeCloseTo(0.5);
    expect(resolveFeedback(true, RESOLVE_RING_LIFETIME).ringAlpha).toBe(0);
    expect(resolveFeedback(true, RESOLVE_RING_LIFETIME + 1).ringAlpha).toBe(0);
  });

  it("fades the unchosen cell fast and fully, with no ring", () => {
    expect(resolveFeedback(false, 0).alpha).toBeCloseTo(0.85);
    const done = resolveFeedback(false, RESOLVE_UNCHOSEN_FADE);
    expect(done.alpha).toBeCloseTo(0.1);
    expect(done.ringAlpha).toBe(0);
    expect(resolveFeedback(false, 10).alpha).toBeCloseTo(0.1);
  });
});

import { describe, expect, it } from "vitest";
import { applyBattleTick } from "./battle.ts";

describe("applyBattleTick", () => {
  it("stops at hp when the boss has less HP than the attacking count", () => {
    expect(applyBattleTick(100, 40, 60)).toEqual({ count: 60, bossHp: 0 });
  });

  it("stops at count when the army is smaller than the boss HP", () => {
    expect(applyBattleTick(30, 100, 60)).toEqual({ count: 0, bossHp: 70 });
  });

  it("does nothing when n is 0", () => {
    expect(applyBattleTick(50, 50, 0)).toEqual({ count: 50, bossHp: 50 });
  });
});

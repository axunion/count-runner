import { describe, expect, it } from "vitest";
import { nextCombo } from "./combo.ts";

describe("nextCombo", () => {
  it("increments when the chosen side matches the better side", () => {
    expect(nextCombo(2, "left", "left")).toEqual({
      combo: 3,
      feverTriggered: false,
    });
  });

  it("resets to 0 when the chosen side is not the better side", () => {
    expect(nextCombo(4, "left", "right")).toEqual({
      combo: 0,
      feverTriggered: false,
    });
  });

  it("keeps the combo unchanged on a tie", () => {
    expect(nextCombo(3, "tie", "left")).toEqual({
      combo: 3,
      feverTriggered: false,
    });
  });

  it("triggers fever exactly at multiples of COMBO_FEVER_THRESHOLD (5)", () => {
    expect(nextCombo(4, "left", "left")).toEqual({
      combo: 5,
      feverTriggered: true,
    });
    expect(nextCombo(9, "left", "left")).toEqual({
      combo: 10,
      feverTriggered: true,
    });
  });

  it("does not trigger fever on non-multiples", () => {
    expect(nextCombo(5, "left", "left")).toEqual({
      combo: 6,
      feverTriggered: false,
    });
  });

  it("does not re-trigger fever on a tie while the combo already sits at a multiple", () => {
    expect(nextCombo(5, "tie", "left")).toEqual({
      combo: 5,
      feverTriggered: false,
    });
    expect(nextCombo(10, "tie", "right")).toEqual({
      combo: 10,
      feverTriggered: false,
    });
  });
});

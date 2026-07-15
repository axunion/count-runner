import { COMBO_FEVER_THRESHOLD } from "../constants.ts";

export interface ComboResult {
  combo: number;
  feverTriggered: boolean;
}

export function nextCombo(
  currentCombo: number,
  outcome: "left" | "right" | "tie",
  chosenSide: "left" | "right",
): ComboResult {
  if (outcome === "tie") {
    return { combo: currentCombo, feverTriggered: false };
  }
  if (outcome !== chosenSide) {
    return { combo: 0, feverTriggered: false };
  }
  const combo = currentCombo + 1;
  return { combo, feverTriggered: combo % COMBO_FEVER_THRESHOLD === 0 };
}

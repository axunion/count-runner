import {
  MAX_UNITS,
  PHASE2_START,
  PHASE3_START,
  ROW_PATTERN_RATES,
} from "../constants.ts";
import type { GateKind } from "../theme/themeConfig.ts";

export function rollRowPattern(
  distance: number,
  rng: () => number,
): { a: GateKind; b: GateKind } {
  const phase =
    distance < PHASE2_START
      ? "phase1"
      : distance < PHASE3_START
        ? "phase2"
        : "phase3";
  const rates = ROW_PATTERN_RATES[phase];
  const roll = rng();

  const addVsBadCeiling = rates.addVsBad;
  const multiplyVsBadCeiling = addVsBadCeiling + rates.multiplyVsBad;
  const multiplyVsAddCeiling = multiplyVsBadCeiling + rates.multiplyVsAdd;

  if (roll < addVsBadCeiling) return { a: "add", b: "subtract" };
  if (roll < multiplyVsBadCeiling) return { a: "multiply", b: "subtract" };
  if (roll < multiplyVsAddCeiling) return { a: "multiply", b: "add" };
  return { a: "subtract", b: "subtract" };
}

export function applyGate(
  kind: GateKind,
  value: number,
  count: number,
): number {
  if (kind === "add") return Math.min(MAX_UNITS, count + value);
  if (kind === "multiply") return Math.min(MAX_UNITS, count * value);
  return Math.max(0, count - value);
}

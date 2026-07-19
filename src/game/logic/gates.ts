import {
  GATE_ADD_RANGES,
  GATE_SUBTRACT_RANGES,
  GATE_X3_RATES,
  MAX_UNITS,
  PHASE2_START,
  PHASE3_START,
  ROW_PATTERN_RATES,
} from "../constants.ts";
import type { GateKind } from "../theme/themeConfig.ts";
import type { GateCell } from "./types.ts";

export type Phase = "phase1" | "phase2" | "phase3";

export function phaseAt(distance: number): Phase {
  if (distance < PHASE2_START) return "phase1";
  if (distance < PHASE3_START) return "phase2";
  return "phase3";
}

export interface RowPattern {
  a: GateKind;
  b: GateKind;
  guarded: boolean;
}

export function rollRowPattern(
  distance: number,
  rng: () => number,
): RowPattern {
  const rates = ROW_PATTERN_RATES[phaseAt(distance)];
  const roll = rng();

  const addVsBadCeiling = rates.addVsBad;
  const multiplyVsBadCeiling = addVsBadCeiling + rates.multiplyVsBad;
  const multiplyVsAddCeiling = multiplyVsBadCeiling + rates.multiplyVsAdd;
  const dangerCeiling = multiplyVsAddCeiling + rates.danger;

  if (roll < addVsBadCeiling)
    return { a: "add", b: "subtract", guarded: false };
  if (roll < multiplyVsBadCeiling) {
    return { a: "multiply", b: "subtract", guarded: false };
  }
  if (roll < multiplyVsAddCeiling) {
    return { a: "multiply", b: "add", guarded: false };
  }
  if (roll < dangerCeiling)
    return { a: "subtract", b: "subtract", guarded: false };
  return { a: "multiply", b: "add", guarded: true };
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

export function rollGateValue(
  kind: GateKind,
  distance: number,
  rng: () => number,
): number {
  const phase = phaseAt(distance);

  if (kind === "multiply") {
    const x3Rate = GATE_X3_RATES[phase];
    return rng() < 1 - x3Rate ? 2 : 3;
  }

  const [min, max] =
    kind === "add" ? GATE_ADD_RANGES[phase] : GATE_SUBTRACT_RANGES[phase];
  const count = max - min + 1;
  return min + Math.floor(rng() * count);
}

function sideResult(cell: GateCell, count: number): number {
  if (cell.guard !== undefined) {
    if (cell.guard >= count) return 0;
    return applyGate(cell.kind, cell.value, count - cell.guard);
  }
  return applyGate(cell.kind, cell.value, count);
}

export function betterSide(
  row: { left: GateCell; right: GateCell },
  count: number,
): "left" | "right" | "tie" {
  const leftResult = sideResult(row.left, count);
  const rightResult = sideResult(row.right, count);
  if (leftResult === rightResult) return "tie";
  return leftResult > rightResult ? "left" : "right";
}

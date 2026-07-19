import {
  FAST_ROW_RATE,
  FAST_ROW_SPEED_MULT,
  GATE_ASYM_OFFSET,
  GATE_BOUNDARY_DEFAULT,
  GATE_BOUNDARY_MAX,
  GATE_BOUNDARY_MIN,
  GATE_CELL_GAP,
  GATE_OSC_AMP_MAX,
  GATE_OSC_AMP_MIN,
  GATE_OSC_PERIOD_MAX,
  GATE_OSC_PERIOD_MIN,
  GATE_OSC_RATES,
  LANE_MARGIN,
  ROW_BREATHER_MULT,
  ROW_BREATHER_RATE,
  ROW_CLUSTER_GAP,
  ROW_CLUSTER_RATE,
  ROW_GAP_BASE,
  ROW_GAP_JITTER,
  VIEW_W,
} from "../constants.ts";
import { phaseAt } from "./gates.ts";
import type { GateCell, GateRow, RowOscillation } from "./types.ts";

export interface RowMods {
  boundaryX: number;
  oscillation?: RowOscillation;
  speedMult: number;
}

export interface CellRect {
  x: number;
  width: number;
}

// Single source of truth for the left/right boundary; collision resolution
// and rendering must both read the boundary through this function.
export function boundaryXAt(
  row: Pick<GateRow, "boundaryX" | "oscillation">,
  elapsed: number,
): number {
  const osc = row.oscillation;
  const raw = osc
    ? row.boundaryX +
      osc.amp * Math.sin((Math.PI * 2 * elapsed) / osc.period + osc.phase)
    : row.boundaryX;
  return Math.min(GATE_BOUNDARY_MAX, Math.max(GATE_BOUNDARY_MIN, raw));
}

export function cellRects(boundaryX: number): {
  left: CellRect;
  right: CellRect;
} {
  const half = GATE_CELL_GAP / 2;
  return {
    left: { x: LANE_MARGIN, width: boundaryX - half - LANE_MARGIN },
    right: {
      x: boundaryX + half,
      width: VIEW_W - LANE_MARGIN - (boundaryX + half),
    },
  };
}

const KIND_RANK = { multiply: 2, add: 1, subtract: 0 } as const;

export function narrowSide(
  left: GateCell,
  right: GateCell,
): "left" | "right" | undefined {
  const leftRank = KIND_RANK[left.kind];
  const rightRank = KIND_RANK[right.kind];
  if (leftRank !== rightRank) return leftRank > rightRank ? "left" : "right";
  // Danger rows (subtract vs subtract): the smaller loss is the better side.
  if (left.kind === "subtract" && left.value !== right.value) {
    return left.value < right.value ? "left" : "right";
  }
  return undefined;
}

export function rollRowMods(
  left: GateCell,
  right: GateCell,
  distance: number,
  rng: () => number,
): RowMods {
  const phase = phaseAt(distance);
  const mods: RowMods = {
    boundaryX: GATE_BOUNDARY_DEFAULT,
    speedMult: 1,
  };
  if (phase === "phase1") return mods;

  const narrow = narrowSide(left, right);
  if (narrow === "left") mods.boundaryX -= GATE_ASYM_OFFSET;
  else if (narrow === "right") mods.boundaryX += GATE_ASYM_OFFSET;

  if (rng() < GATE_OSC_RATES[phase]) {
    mods.oscillation = {
      amp: GATE_OSC_AMP_MIN + rng() * (GATE_OSC_AMP_MAX - GATE_OSC_AMP_MIN),
      period:
        GATE_OSC_PERIOD_MIN +
        rng() * (GATE_OSC_PERIOD_MAX - GATE_OSC_PERIOD_MIN),
      phase: rng() * Math.PI * 2,
    };
  }

  if (phase === "phase3" && rng() < FAST_ROW_RATE) {
    mods.speedMult = FAST_ROW_SPEED_MULT;
  }
  return mods;
}

export function rollRowGap(distance: number, rng: () => number): number {
  const phase = phaseAt(distance);
  const base = ROW_GAP_BASE[phase];
  if (phase !== "phase1") {
    const roll = rng();
    if (roll < ROW_CLUSTER_RATE) return ROW_CLUSTER_GAP;
    if (roll < ROW_CLUSTER_RATE + ROW_BREATHER_RATE) {
      return base * ROW_BREATHER_MULT;
    }
  }
  return base + (rng() * 2 - 1) * ROW_GAP_JITTER;
}

import type { GateKind } from "../theme/themeConfig.ts";

export interface Unit {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  wobblePhase: number;
}

export interface GateCell {
  kind: GateKind;
  value: number;
  displayValue: string;
  guard?: number;
}

export interface GateRow {
  y: number;
  left: GateCell;
  right: GateCell;
  resolved: boolean;
}

export type GamePhase = "ready" | "running" | "finale" | "cleared" | "gameover";

export interface Boss {
  hp: number;
  y: number;
}

export interface FloatText {
  text: string;
  color: string;
  x: number;
  y: number;
  age: number;
  scale: number;
}

export interface WorldState {
  distance: number;
  elapsed: number;
  leaderX: number;
  targetX: number;
  pointerActive: boolean;
  units: Unit[];
  rows: GateRow[];
  nextRowDistance: number;
  effects: FloatText[];
  progressPercent: number;
  combo: number;
  maxCombo: number;
  feverTimer: number;
  boss: Boss | null;
  battleCarry: number;
}

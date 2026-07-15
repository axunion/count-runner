import type { GateKind } from "../theme/themeConfig.ts";

export interface Unit {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  wobblePhase: number;
}

export interface GateRow {
  y: number;
  left: GateKind;
  right: GateKind;
  resolved: boolean;
}

export type GamePhase = "ready" | "running" | "cleared" | "gameover";

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
}

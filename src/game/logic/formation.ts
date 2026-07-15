import { FORMATION_SPACING, GOLDEN_ANGLE } from "../constants.ts";
import type { Unit } from "./types.ts";

export function formationOffset(i: number): { x: number; y: number } {
  if (i === 0) return { x: 0, y: 0 };
  const radius = FORMATION_SPACING * Math.sqrt(i);
  const angle = i * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.75 };
}

export function reassignFormation(units: Unit[]) {
  units.forEach((unit, i) => {
    const offset = formationOffset(i);
    unit.offsetX = offset.x;
    unit.offsetY = offset.y;
  });
}

import {
  KEYBOARD_MOVE_SPEED,
  LEADER_CLAMP_MARGIN,
  VIEW_W,
} from "../constants.ts";

export type KeyboardDir = -1 | 0 | 1;

export function keyboardDir(left: boolean, right: boolean): KeyboardDir {
  if (left === right) return 0;
  return left ? -1 : 1;
}

export function nextTargetX(
  current: number,
  dir: KeyboardDir,
  dt: number,
): number {
  const moved = current + dir * KEYBOARD_MOVE_SPEED * dt;
  return Math.min(
    VIEW_W - LEADER_CLAMP_MARGIN,
    Math.max(LEADER_CLAMP_MARGIN, moved),
  );
}

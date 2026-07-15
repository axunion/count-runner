import { VIEW_H_MAX, VIEW_H_MIN, VIEW_W } from "./constants.ts";

export interface Viewport {
  viewW: number;
  viewH: number;
  scale: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeScale(
  vw: number,
  vh: number,
  viewW: number,
  viewH: number,
): number {
  return Math.min(vh / viewH, vw / viewW);
}

export function computeViewport(vw: number, vh: number): Viewport {
  const viewW = VIEW_W;
  const viewH = clamp(Math.round((VIEW_W * vh) / vw), VIEW_H_MIN, VIEW_H_MAX);
  const scale = computeScale(vw, vh, viewW, viewH);
  return { viewW, viewH, scale };
}

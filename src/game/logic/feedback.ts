import {
  RESOLVE_CHOSEN_HOLD,
  RESOLVE_RING_LIFETIME,
  RESOLVE_UNCHOSEN_FADE,
} from "../constants.ts";

export interface ResolveFeedback {
  alpha: number;
  ringAlpha: number;
}

const CHOSEN_PEAK = 0.95;
const CHOSEN_REST = 0.4;
const CHOSEN_EASE_DURATION = 0.4;
const UNCHOSEN_START = 0.85;
const UNCHOSEN_REST = 0.1;

export function resolveFeedback(chosen: boolean, age: number): ResolveFeedback {
  if (!chosen) {
    const t = Math.min(1, age / RESOLVE_UNCHOSEN_FADE);
    return {
      alpha: UNCHOSEN_START + (UNCHOSEN_REST - UNCHOSEN_START) * t,
      ringAlpha: 0,
    };
  }
  const easeAge = Math.max(0, age - RESOLVE_CHOSEN_HOLD);
  const t = Math.min(1, easeAge / CHOSEN_EASE_DURATION);
  return {
    alpha: CHOSEN_PEAK + (CHOSEN_REST - CHOSEN_PEAK) * t,
    ringAlpha: Math.max(0, 1 - age / RESOLVE_RING_LIFETIME),
  };
}

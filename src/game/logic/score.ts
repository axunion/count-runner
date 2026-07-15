import {
  BEST_STORAGE_KEY,
  SCORE_PER_COMBO,
  SCORE_PER_UNIT,
} from "../constants.ts";

export interface ScoreResult {
  score: number;
  best: number;
  isNewRecord: boolean;
}

export function computeScore(unitsRemaining: number, maxCombo: number): number {
  return unitsRemaining * SCORE_PER_UNIT + maxCombo * SCORE_PER_COMBO;
}

export function readBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_STORAGE_KEY);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function writeBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_STORAGE_KEY, String(score));
  } catch {
    // localStorage may be unavailable (e.g. private browsing); ignore.
  }
}

export function recordScore(
  unitsRemaining: number,
  maxCombo: number,
): ScoreResult {
  const score = computeScore(unitsRemaining, maxCombo);
  const best = readBestScore();
  const isNewRecord = score > best;
  if (isNewRecord) writeBestScore(score);
  return { score, best: Math.max(score, best), isNewRecord };
}

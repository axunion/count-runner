export function applyBattleTick(
  count: number,
  bossHp: number,
  n: number,
): { count: number; bossHp: number } {
  const d = Math.min(n, count, bossHp);
  return { count: count - d, bossHp: bossHp - d };
}

import {
  BATTLE_DRAIN_RATE,
  BOSS_HP_BASE,
  BOSS_Y,
  FAST_ROW_EXTRA_GAP_MULT,
  FEVER_DURATION,
  FEVER_GAIN_MULT,
  FLOAT_LIFETIME,
  FLOAT_MULTIPLY_SCALE,
  FLOAT_RISE_SPEED,
  GOAL_DISTANCE,
  GOAL_SAFETY,
  GUARD_MIN,
  GUARD_RATIO_MAX,
  GUARD_RATIO_MIN,
  INITIAL_UNITS,
  LANE_MARGIN,
  LEADER_BOTTOM_OFFSET,
  LEADER_LERP_RATE,
  MAX_UNITS,
  ROW_HEIGHT,
  SCROLL_SPEED_BASE,
  SCROLL_SPEED_MAX,
  SPAWN_JITTER,
  UNIT_FOLLOW_RATE,
  UNIT_RADIUS,
  VIEW_W,
  WOBBLE_AMP,
  WOBBLE_FREQ,
} from "../constants.ts";
import type { GateKind, ThemeAssetConfig } from "../theme/themeConfig.ts";
import type { Viewport } from "../viewport.ts";
import { applyBattleTick } from "./battle.ts";
import { nextCombo } from "./combo.ts";
import { formationOffset, reassignFormation } from "./formation.ts";
import {
  applyGate,
  betterSide,
  rollGateValue,
  rollRowPattern,
} from "./gates.ts";
import { boundaryXAt, cellRects, rollRowGap, rollRowMods } from "./rows.ts";
import type { GamePhase, GateCell, Unit, WorldState } from "./types.ts";

export interface StepEvents {
  gateResolved?: {
    newCount: number;
    newCombo: number;
    feverTriggered: boolean;
  };
  unitCountChanged?: number;
  enteredFinale?: boolean;
  finished?: Extract<GamePhase, "cleared" | "gameover">;
  progressPercent?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function scrollSpeedAt(distance: number): number {
  const t = clamp(distance / GOAL_DISTANCE, 0, 1);
  return SCROLL_SPEED_BASE + (SCROLL_SPEED_MAX - SCROLL_SPEED_BASE) * t;
}

function dampLerp(
  current: number,
  target: number,
  rate: number,
  dt: number,
): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function createUnit(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
): Unit {
  return { x, y, offsetX, offsetY, wobblePhase: Math.random() * Math.PI * 2 };
}

export function createWorldState(viewport: Viewport): WorldState {
  const leaderX = VIEW_W / 2;
  const leaderY = viewport.viewH - LEADER_BOTTOM_OFFSET;
  const units: Unit[] = [];
  for (let i = 0; i < INITIAL_UNITS; i++) {
    const offset = formationOffset(i);
    units.push(
      createUnit(leaderX + offset.x, leaderY + offset.y, offset.x, offset.y),
    );
  }

  return {
    distance: 0,
    elapsed: 0,
    leaderX,
    targetX: leaderX,
    pointerActive: false,
    units,
    rows: [],
    nextRowDistance: 0,
    effects: [],
    progressPercent: 0,
    combo: 0,
    maxCombo: 0,
    feverTimer: 0,
    boss: null,
    battleCarry: 0,
  };
}

function rollCell(
  kind: GateKind,
  distance: number,
  theme: ThemeAssetConfig,
  rng: () => number,
  guard?: number,
): GateCell {
  const value = rollGateValue(kind, distance, rng);
  const cell: GateCell = {
    kind,
    value,
    displayValue: `${theme.gates[kind].displayPrefix}${value}`,
  };
  if (guard !== undefined) cell.guard = guard;
  return cell;
}

function rollGuardCount(units: number, rng: () => number): number {
  const ratio = GUARD_RATIO_MIN + rng() * (GUARD_RATIO_MAX - GUARD_RATIO_MIN);
  return Math.max(GUARD_MIN, Math.round(units * ratio));
}

function spawnRowsIfNeeded(
  world: WorldState,
  theme: ThemeAssetConfig,
  rng: () => number,
) {
  while (
    world.distance >= world.nextRowDistance &&
    world.nextRowDistance < GOAL_DISTANCE - GOAL_SAFETY
  ) {
    const pattern = rollRowPattern(world.nextRowDistance, rng);
    const flip = rng() < 0.5;
    const leftKind = flip ? pattern.a : pattern.b;
    const rightKind = flip ? pattern.b : pattern.a;
    const guard = pattern.guarded
      ? rollGuardCount(world.units.length, rng)
      : undefined;
    const leftGuard = leftKind === "multiply" ? guard : undefined;
    const rightGuard = rightKind === "multiply" ? guard : undefined;
    const left = rollCell(
      leftKind,
      world.nextRowDistance,
      theme,
      rng,
      leftGuard,
    );
    const right = rollCell(
      rightKind,
      world.nextRowDistance,
      theme,
      rng,
      rightGuard,
    );
    const mods = rollRowMods(left, right, world.nextRowDistance, rng);
    world.rows.push({ y: -ROW_HEIGHT, left, right, resolved: false, ...mods });
    const gap = rollRowGap(world.nextRowDistance, rng);
    world.nextRowDistance +=
      gap * (mods.speedMult > 1 ? FAST_ROW_EXTRA_GAP_MULT : 1);
  }
}

function updateRows(
  world: WorldState,
  viewport: Viewport,
  speed: number,
  dt: number,
) {
  const scrollDelta = speed * dt;
  for (const row of world.rows) row.y += scrollDelta * row.speedMult;
  world.rows = world.rows.filter((row) => row.y < viewport.viewH + ROW_HEIGHT);
}

function updateUnitsTowardAnchor(
  world: WorldState,
  dt: number,
  anchorX: number,
  anchorY: number,
) {
  const wobbleBase = world.elapsed * WOBBLE_FREQ;
  const minX = LANE_MARGIN + UNIT_RADIUS;
  const maxX = VIEW_W - LANE_MARGIN - UNIT_RADIUS;

  for (const unit of world.units) {
    const wobble = Math.sin(wobbleBase + unit.wobblePhase) * WOBBLE_AMP;
    const targetX = clamp(anchorX + unit.offsetX + wobble, minX, maxX);
    const targetY = anchorY + unit.offsetY;
    unit.x = dampLerp(unit.x, targetX, UNIT_FOLLOW_RATE, dt);
    unit.y = dampLerp(unit.y, targetY, UNIT_FOLLOW_RATE, dt);
  }
}

function updateUnits(world: WorldState, viewport: Viewport, dt: number) {
  const leaderY = viewport.viewH - LEADER_BOTTOM_OFFSET;
  updateUnitsTowardAnchor(world, dt, world.leaderX, leaderY);
}

function updateFloatTexts(world: WorldState, dt: number) {
  for (const effect of world.effects) {
    effect.age += dt;
    effect.y -= FLOAT_RISE_SPEED * dt;
  }
  world.effects = world.effects.filter((effect) => effect.age < FLOAT_LIFETIME);
}

function applyFeverBonus(before: number, after: number): number {
  const gain = after - before;
  if (gain <= 0) return after;
  return Math.min(MAX_UNITS, before + Math.ceil(gain * FEVER_GAIN_MULT));
}

function payGuardToll(
  world: WorldState,
  theme: ThemeAssetConfig,
  guard: number,
  spawnY: number,
  spawnX: number,
): boolean {
  const current = world.units.length;
  const next = Math.max(0, current - guard);
  if (next < current) world.units.length = next;
  world.effects.push({
    text: `-${guard}`,
    color: theme.enemy.color,
    x: spawnX,
    y: spawnY,
    age: 0,
    scale: 1,
  });
  return next > 0;
}

function applyGateEffect(
  world: WorldState,
  theme: ThemeAssetConfig,
  cell: GateCell,
  spawnY: number,
  spawnX: number,
): { newCount: number; gameover: boolean } {
  if (cell.guard !== undefined) {
    const survived = payGuardToll(world, theme, cell.guard, spawnY, spawnX);
    if (!survived) return { newCount: 0, gameover: true };
  }

  const gate = theme.gates[cell.kind];
  const current = world.units.length;
  const rawNext = applyGate(cell.kind, cell.value, current);
  const next =
    world.feverTimer > 0 ? applyFeverBonus(current, rawNext) : rawNext;

  if (next > current) {
    const jitterRange = SPAWN_JITTER * 2;
    for (let i = current; i < next; i++) {
      const x = spawnX + Math.random() * jitterRange - SPAWN_JITTER;
      world.units.push(createUnit(x, spawnY, 0, 0));
    }
  } else if (next < current) {
    world.units.length = next;
  }

  reassignFormation(world.units);
  world.effects.push({
    text: cell.displayValue,
    color: gate.color,
    x: spawnX,
    y: spawnY,
    age: 0,
    scale: cell.kind === "multiply" ? FLOAT_MULTIPLY_SCALE : 1,
  });

  return { newCount: next, gameover: next === 0 };
}

function resolveRowCollisions(
  world: WorldState,
  viewport: Viewport,
  theme: ThemeAssetConfig,
): StepEvents {
  const events: StepEvents = {};
  const leaderY = viewport.viewH - LEADER_BOTTOM_OFFSET;
  for (const row of world.rows) {
    if (row.resolved || row.y < leaderY) continue;
    row.resolved = true;
    const boundary = boundaryXAt(row, world.elapsed);
    const isLeft = world.leaderX < boundary;
    const chosenSide: "left" | "right" = isLeft ? "left" : "right";
    row.chosenSide = chosenSide;
    row.resolvedAt = world.elapsed;
    // Freeze the geometry so the resolved highlight does not keep sliding.
    row.boundaryX = boundary;
    row.oscillation = undefined;
    const cell = isLeft ? row.left : row.right;
    const rects = cellRects(boundary);
    const rect = isLeft ? rects.left : rects.right;
    const cellCenterX = rect.x + rect.width / 2;
    const outcome = betterSide(row, world.units.length);
    const { newCount, gameover } = applyGateEffect(
      world,
      theme,
      cell,
      row.y,
      cellCenterX,
    );
    const { combo, feverTriggered } = nextCombo(
      world.combo,
      outcome,
      chosenSide,
    );
    world.combo = combo;
    world.maxCombo = Math.max(world.maxCombo, combo);
    if (feverTriggered) world.feverTimer = FEVER_DURATION;
    events.gateResolved = { newCount, newCombo: combo, feverTriggered };
    if (gameover) events.finished = "gameover";
  }
  return events;
}

function stepRunning(
  world: WorldState,
  viewport: Viewport,
  theme: ThemeAssetConfig,
  dt: number,
  rng: () => number,
): StepEvents {
  const speed = scrollSpeedAt(world.distance);
  world.distance += speed * dt;
  world.elapsed += dt;
  spawnRowsIfNeeded(world, theme, rng);
  updateRows(world, viewport, speed, dt);
  world.leaderX = dampLerp(world.leaderX, world.targetX, LEADER_LERP_RATE, dt);
  updateUnits(world, viewport, dt);
  updateFloatTexts(world, dt);
  world.feverTimer = Math.max(0, world.feverTimer - dt);

  const events = resolveRowCollisions(world, viewport, theme);

  if (!events.finished && world.distance >= GOAL_DISTANCE) {
    world.boss = { hp: BOSS_HP_BASE, y: BOSS_Y };
    events.enteredFinale = true;
  }

  const percent = Math.min(
    100,
    Math.floor((world.distance / GOAL_DISTANCE) * 100),
  );
  if (percent !== world.progressPercent) {
    world.progressPercent = percent;
    events.progressPercent = percent;
  }

  return events;
}

function stepFinale(world: WorldState, dt: number): StepEvents {
  const boss = world.boss;
  if (!boss) return {};

  world.elapsed += dt;
  world.battleCarry += BATTLE_DRAIN_RATE * dt;
  const n = Math.floor(world.battleCarry);
  world.battleCarry -= n;

  const countBefore = world.units.length;
  const { count, bossHp } = applyBattleTick(countBefore, boss.hp, n);
  boss.hp = bossHp;
  if (count < countBefore) {
    world.units.length = count;
  }

  updateUnitsTowardAnchor(world, dt, VIEW_W / 2, boss.y);
  updateFloatTexts(world, dt);

  const events: StepEvents = {};
  if (count !== countBefore) {
    events.unitCountChanged = count;
  }
  if (bossHp <= 0 && count > 0) {
    events.finished = "cleared";
  } else if (count <= 0) {
    events.finished = "gameover";
  }
  return events;
}

export function stepWorld(
  world: WorldState,
  viewport: Viewport,
  theme: ThemeAssetConfig,
  dt: number,
  rng: () => number,
): StepEvents {
  if (world.boss) {
    return stepFinale(world, dt);
  }
  return stepRunning(world, viewport, theme, dt, rng);
}

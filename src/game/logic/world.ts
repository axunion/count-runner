import {
  FLOAT_LIFETIME,
  FLOAT_MULTIPLY_SCALE,
  FLOAT_RISE_SPEED,
  GATE_CELL_LEFT_X,
  GATE_CELL_RIGHT_X,
  GATE_CELL_WIDTH,
  GOAL_DISTANCE,
  GOAL_SAFETY,
  INITIAL_UNITS,
  LANE_MARGIN,
  LEADER_BOTTOM_OFFSET,
  LEADER_LERP_RATE,
  ROW_HEIGHT,
  ROW_INTERVAL,
  SCROLL_SPEED,
  UNIT_FOLLOW_RATE,
  UNIT_RADIUS,
  VIEW_W,
  WOBBLE_AMP,
  WOBBLE_FREQ,
} from "../constants.ts";
import type { GateKind, ThemeAssetConfig } from "../theme/themeConfig.ts";
import type { Viewport } from "../viewport.ts";
import { formationOffset, reassignFormation } from "./formation.ts";
import { applyGate, rollRowPattern } from "./gates.ts";
import type { GamePhase, Unit, WorldState } from "./types.ts";

export interface StepEvents {
  gateResolved?: { newCount: number };
  finished?: Extract<GamePhase, "cleared" | "gameover">;
  progressPercent?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
  };
}

function spawnRowsIfNeeded(world: WorldState, rng: () => number) {
  while (
    world.distance >= world.nextRowDistance &&
    world.nextRowDistance < GOAL_DISTANCE - GOAL_SAFETY
  ) {
    const pattern = rollRowPattern(world.nextRowDistance, rng);
    const flip = rng() < 0.5;
    world.rows.push({
      y: -ROW_HEIGHT,
      left: flip ? pattern.a : pattern.b,
      right: flip ? pattern.b : pattern.a,
      resolved: false,
    });
    world.nextRowDistance += ROW_INTERVAL;
  }
}

function updateRows(world: WorldState, viewport: Viewport, dt: number) {
  const scrollDelta = SCROLL_SPEED * dt;
  for (const row of world.rows) row.y += scrollDelta;
  world.rows = world.rows.filter((row) => row.y < viewport.viewH + ROW_HEIGHT);
}

function updateUnits(world: WorldState, viewport: Viewport, dt: number) {
  const wobbleBase = world.elapsed * WOBBLE_FREQ;
  const minX = LANE_MARGIN + UNIT_RADIUS;
  const maxX = VIEW_W - LANE_MARGIN - UNIT_RADIUS;
  const leaderY = viewport.viewH - LEADER_BOTTOM_OFFSET;

  for (const unit of world.units) {
    const wobble = Math.sin(wobbleBase + unit.wobblePhase) * WOBBLE_AMP;
    const targetX = clamp(world.leaderX + unit.offsetX + wobble, minX, maxX);
    const targetY = leaderY + unit.offsetY;
    unit.x = dampLerp(unit.x, targetX, UNIT_FOLLOW_RATE, dt);
    unit.y = dampLerp(unit.y, targetY, UNIT_FOLLOW_RATE, dt);
  }
}

function updateFloatTexts(world: WorldState, dt: number) {
  for (const effect of world.effects) {
    effect.age += dt;
    effect.y -= FLOAT_RISE_SPEED * dt;
  }
  world.effects = world.effects.filter((effect) => effect.age < FLOAT_LIFETIME);
}

function applyGateEffect(
  world: WorldState,
  theme: ThemeAssetConfig,
  kind: GateKind,
  spawnY: number,
  spawnX: number,
): { newCount: number; gameover: boolean } {
  const gate = theme.gates[kind];
  const current = world.units.length;
  const next = applyGate(kind, gate.value, current);

  if (next > current) {
    for (let i = current; i < next; i++) {
      const x = spawnX + (Math.random() * 40 - 20);
      world.units.push(createUnit(x, spawnY, 0, 0));
    }
  } else if (next < current) {
    world.units.length = next;
  }

  reassignFormation(world.units);
  world.effects.push({
    text: gate.displayValue,
    color: gate.color,
    x: spawnX,
    y: spawnY,
    age: 0,
    scale: kind === "multiply" ? FLOAT_MULTIPLY_SCALE : 1,
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
    const isLeft = world.leaderX < VIEW_W / 2;
    const kind = isLeft ? row.left : row.right;
    const cellCenterX =
      (isLeft ? GATE_CELL_LEFT_X : GATE_CELL_RIGHT_X) + GATE_CELL_WIDTH / 2;
    const { newCount, gameover } = applyGateEffect(
      world,
      theme,
      kind,
      row.y,
      cellCenterX,
    );
    events.gateResolved = { newCount };
    if (gameover) events.finished = "gameover";
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
  world.distance += SCROLL_SPEED * dt;
  world.elapsed += dt;
  spawnRowsIfNeeded(world, rng);
  updateRows(world, viewport, dt);
  world.leaderX = dampLerp(world.leaderX, world.targetX, LEADER_LERP_RATE, dt);
  updateUnits(world, viewport, dt);
  updateFloatTexts(world, dt);

  const events = resolveRowCollisions(world, viewport, theme);

  if (!events.finished && world.distance >= GOAL_DISTANCE) {
    events.finished = "cleared";
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

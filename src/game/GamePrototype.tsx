import { createSignal, onCleanup, onMount, Show } from "solid-js";
import styles from "./GamePrototype.module.css";
import type { GateKind, ThemeAssetConfig, ThemeAssets } from "./themeConfig.ts";
import theme from "./themeConfig.ts";

const VIEW_W = 360;
const VIEW_H = 640;
const DPR_CAP = 2;
const MAX_DT = 1 / 30;
const SCROLL_SPEED = 180;
const STRIPE_INTERVAL = 80;
const LEADER_Y = 520;
const LEADER_GLYPH_RADIUS = 14;
const GLYPH_ROT_SPEED = 1.2;
const LEADER_LERP_RATE = 12;
const LEADER_CLAMP_MARGIN = 24;
const UNIT_FOLLOW_RATE = 8;
const UNIT_RADIUS = 5;
const FORMATION_SPACING = 7;
const GOLDEN_ANGLE = 2.399963;
const WOBBLE_AMP = 1.5;
const WOBBLE_FREQ = 6;
const LANE_MARGIN = 12;
const INITIAL_UNITS = 10;
const ROW_INTERVAL = 260;
const ROW_HEIGHT = 56;
const GOAL_DISTANCE = 6000;
const GOAL_SAFETY = 400;
const PHASE2_START = 2000;
const PHASE3_START = 4200;
const MAX_UNITS = 300;
const FLOAT_LIFETIME = 0.8;
const FLOAT_RISE_SPEED = 45;
const FLOAT_MULTIPLY_SCALE = 1.5;
const GATE_CELL_WIDTH = 164;
const GATE_CELL_LEFT_X = 12;
const GATE_CELL_RIGHT_X = 184;

const ROW_PATTERN_RATES = {
  phase1: {
    addVsBad: 0.6,
    multiplyVsBad: 0.25,
    multiplyVsAdd: 0.15,
  },
  phase2: {
    addVsBad: 0.35,
    multiplyVsBad: 0.25,
    multiplyVsAdd: 0.3,
  },
  phase3: {
    addVsBad: 0.25,
    multiplyVsBad: 0.2,
    multiplyVsAdd: 0.25,
  },
} as const;

interface Unit {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  wobblePhase: number;
}

interface GateRow {
  y: number;
  left: GateKind;
  right: GateKind;
  resolved: boolean;
}

type GamePhase = "ready" | "running" | "cleared" | "gameover";

interface FloatText {
  text: string;
  color: string;
  x: number;
  y: number;
  age: number;
  scale: number;
}

interface WorldState {
  distance: number;
  elapsed: number;
  leaderX: number;
  targetX: number;
  pointerActive: boolean;
  units: Unit[];
  rows: GateRow[];
  nextRowDistance: number;
  effects: FloatText[];
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

export function formationOffset(i: number): { x: number; y: number } {
  if (i === 0) return { x: 0, y: 0 };
  const radius = FORMATION_SPACING * Math.sqrt(i);
  const angle = i * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.75 };
}

export function rollRowPattern(
  distance: number,
  rng: () => number,
): { a: GateKind; b: GateKind } {
  const phase =
    distance < PHASE2_START
      ? "phase1"
      : distance < PHASE3_START
        ? "phase2"
        : "phase3";
  const rates = ROW_PATTERN_RATES[phase];
  const roll = rng();

  const addVsBadCeiling = rates.addVsBad;
  const multiplyVsBadCeiling = addVsBadCeiling + rates.multiplyVsBad;
  const multiplyVsAddCeiling = multiplyVsBadCeiling + rates.multiplyVsAdd;

  if (roll < addVsBadCeiling) return { a: "add", b: "subtract" };
  if (roll < multiplyVsBadCeiling) return { a: "multiply", b: "subtract" };
  if (roll < multiplyVsAddCeiling) return { a: "multiply", b: "add" };
  return { a: "subtract", b: "subtract" };
}

export function applyGate(
  kind: GateKind,
  value: number,
  count: number,
): number {
  if (kind === "add") return Math.min(MAX_UNITS, count + value);
  if (kind === "multiply") return Math.min(MAX_UNITS, count * value);
  return Math.max(0, count - value);
}

function reassignFormation(units: Unit[]) {
  units.forEach((unit, i) => {
    const offset = formationOffset(i);
    unit.offsetX = offset.x;
    unit.offsetY = offset.y;
  });
}

function createUnit(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
): Unit {
  return { x, y, offsetX, offsetY, wobblePhase: Math.random() * Math.PI * 2 };
}

function createWorldState(): WorldState {
  const leaderX = VIEW_W / 2;
  const units: Unit[] = [];
  for (let i = 0; i < INITIAL_UNITS; i++) {
    const offset = formationOffset(i);
    units.push(
      createUnit(leaderX + offset.x, LEADER_Y + offset.y, offset.x, offset.y),
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
  };
}

type LoadedImages = Partial<Record<keyof ThemeAssets, HTMLImageElement>>;

function loadThemeAssets(assets: ThemeAssets): LoadedImages {
  const images: LoadedImages = {};
  for (const key of Object.keys(assets) as (keyof ThemeAssets)[]) {
    const asset = assets[key];
    if (!asset) continue;
    const img = new Image();
    img.onload = () => {
      images[key] = img;
    };
    img.onerror = () => {
      console.warn(
        `Count Runner: failed to load asset "${key}" from ${asset.src}`,
      );
    };
    img.src = asset.src;
  }
  return images;
}

function getSprite<K extends keyof ThemeAssets>(
  themeConfig: ThemeAssetConfig,
  images: LoadedImages,
  key: K,
): { asset: NonNullable<ThemeAssets[K]>; img: HTMLImageElement } | undefined {
  const asset = themeConfig.assets[key];
  const img = asset && images[key];
  if (!asset || !img) return undefined;
  return { asset, img };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages,
  world: WorldState,
  themeConfig: ThemeAssetConfig,
) {
  const sprite = getSprite(themeConfig, images, "background");

  if (sprite) {
    const tileHeight = sprite.asset.displayHeight;
    const offset = world.distance % tileHeight;
    let y = -offset;
    while (y < VIEW_H) {
      ctx.drawImage(
        sprite.img,
        0,
        y,
        sprite.asset.displayWidth,
        sprite.asset.displayHeight,
      );
      y += tileHeight;
    }
    return;
  }

  ctx.fillStyle = themeConfig.field.backgroundColor;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.strokeStyle = themeConfig.field.stripeColor;
  ctx.lineWidth = 1;
  const stripeOffset = world.distance % STRIPE_INTERVAL;
  for (
    let y = -STRIPE_INTERVAL + stripeOffset;
    y < VIEW_H;
    y += STRIPE_INTERVAL
  ) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2, 0);
  ctx.lineTo(VIEW_W / 2, VIEW_H);
  ctx.stroke();
  ctx.restore();
}

function drawGoalLine(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages,
  world: WorldState,
  themeConfig: ThemeAssetConfig,
) {
  const goalY = LEADER_Y - (GOAL_DISTANCE - world.distance);
  if (goalY <= -40 || goalY >= 680) return;

  const sprite = getSprite(themeConfig, images, "goalBanner");

  if (sprite) {
    ctx.drawImage(
      sprite.img,
      0,
      goalY - sprite.asset.displayHeight / 2,
      sprite.asset.displayWidth,
      sprite.asset.displayHeight,
    );
    return;
  }

  ctx.strokeStyle = themeConfig.field.goalLineColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, goalY);
  ctx.lineTo(VIEW_W, goalY);
  ctx.stroke();

  ctx.fillStyle = themeConfig.field.goalLineColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(themeConfig.field.goalLabel, VIEW_W / 2, goalY - 6);
}

const GATE_ASSET_KEYS: Record<
  GateKind,
  "gateAdd" | "gateMultiply" | "gateSubtract"
> = {
  add: "gateAdd",
  multiply: "gateMultiply",
  subtract: "gateSubtract",
};

function drawGateCell(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages,
  themeConfig: ThemeAssetConfig,
  kind: GateKind,
  x: number,
  y: number,
  width: number,
  height: number,
  resolved: boolean,
) {
  const gate = themeConfig.gates[kind];
  const sprite = getSprite(themeConfig, images, GATE_ASSET_KEYS[kind]);
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.save();
  ctx.globalAlpha = resolved ? 0.25 : 0.85;

  if (sprite) {
    ctx.drawImage(sprite.img, x, y, width, height);
  } else {
    ctx.fillStyle = gate.color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = gate.color;
    ctx.stroke();
  }

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(gate.displayValue, centerX, sprite ? centerY : centerY - 6);

  if (!sprite) {
    ctx.font = "9px sans-serif";
    ctx.fillText(gate.label, centerX, centerY + 12);
  }

  ctx.restore();
}

function drawGateRows(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages,
  world: WorldState,
  themeConfig: ThemeAssetConfig,
) {
  for (const row of world.rows) {
    const cellY = row.y - ROW_HEIGHT / 2;
    for (const [x, kind] of [
      [GATE_CELL_LEFT_X, row.left],
      [GATE_CELL_RIGHT_X, row.right],
    ] as const) {
      drawGateCell(
        ctx,
        images,
        themeConfig,
        kind,
        x,
        cellY,
        GATE_CELL_WIDTH,
        ROW_HEIGHT,
        row.resolved,
      );
    }
  }
}

function drawUnits(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages,
  world: WorldState,
  themeConfig: ThemeAssetConfig,
) {
  const sprite = getSprite(themeConfig, images, "unit");

  if (sprite) {
    const { asset, img } = sprite;
    const frameCount = asset.frameCount ?? 1;
    const fps = asset.fps ?? 8;
    const sourceFrameWidth = img.naturalWidth / frameCount;
    const sourceFrameHeight = img.naturalHeight;
    for (const unit of world.units) {
      const frame = Math.floor(
        (world.elapsed * fps + unit.wobblePhase) % frameCount,
      );
      ctx.drawImage(
        img,
        frame * sourceFrameWidth,
        0,
        sourceFrameWidth,
        sourceFrameHeight,
        unit.x - asset.displayWidth / 2,
        unit.y - asset.displayHeight / 2,
        asset.displayWidth,
        asset.displayHeight,
      );
    }
    return;
  }

  ctx.fillStyle = themeConfig.player.color;
  ctx.beginPath();
  for (const unit of world.units) {
    ctx.moveTo(unit.x + UNIT_RADIUS, unit.y);
    ctx.arc(unit.x, unit.y, UNIT_RADIUS, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawLeaderGlyph(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages,
  world: WorldState,
  themeConfig: ThemeAssetConfig,
) {
  const sprite = getSprite(themeConfig, images, "leaderGlyph");
  const rotation = world.elapsed * GLYPH_ROT_SPEED;

  ctx.save();
  ctx.translate(world.leaderX, LEADER_Y);
  ctx.rotate(rotation);

  if (sprite) {
    ctx.drawImage(
      sprite.img,
      -sprite.asset.displayWidth / 2,
      -sprite.asset.displayHeight / 2,
      sprite.asset.displayWidth,
      sprite.asset.displayHeight,
    );
    ctx.restore();
    return;
  }

  ctx.strokeStyle = themeConfig.player.glyphColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, LEADER_GLYPH_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + i * ((Math.PI * 2) / 3);
    const px = Math.cos(angle) * 9;
    const py = Math.sin(angle) * 9;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawFloatTexts(ctx: CanvasRenderingContext2D, world: WorldState) {
  for (const effect of world.effects) {
    const alpha = Math.max(0, 1 - effect.age / FLOAT_LIFETIME);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = effect.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(20 * effect.scale)}px sans-serif`;
    ctx.fillText(effect.text, effect.x, effect.y);
    ctx.restore();
  }
}

function GamePrototype() {
  let canvasRef: HTMLCanvasElement | undefined;
  let hudValueRef: HTMLDivElement | undefined;
  let ctx: CanvasRenderingContext2D | undefined;
  let rafId = 0;
  let lastTime: number | undefined;
  let world = createWorldState();
  const images = loadThemeAssets(theme.assets);
  const [unitCount, setUnitCount] = createSignal(world.units.length);
  const [progressPercent, setProgressPercent] = createSignal(0);
  const [gamePhase, setGamePhase] = createSignal<GamePhase>("running");

  function retry() {
    world = createWorldState();
    setUnitCount(world.units.length);
    setProgressPercent(0);
    setGamePhase("running");
  }

  function update(dt: number) {
    world.distance += SCROLL_SPEED * dt;
    world.elapsed += dt;
    spawnRowsIfNeeded();
    updateRows(dt);
    world.leaderX = dampLerp(
      world.leaderX,
      world.targetX,
      LEADER_LERP_RATE,
      dt,
    );
    updateUnits(dt);
    updateFloatTexts(dt);
    resolveRowCollisions();
    checkWinCondition();
    updateProgress();
  }

  function checkWinCondition() {
    if (gamePhase() === "running" && world.distance >= GOAL_DISTANCE) {
      setGamePhase("cleared");
    }
  }

  function updateFloatTexts(dt: number) {
    for (const effect of world.effects) {
      effect.age += dt;
      effect.y -= FLOAT_RISE_SPEED * dt;
    }
    world.effects = world.effects.filter(
      (effect) => effect.age < FLOAT_LIFETIME,
    );
  }

  function triggerHudPunch() {
    const el = hudValueRef;
    if (!el) return;
    el.classList.remove(styles.hudPunch);
    void el.offsetWidth;
    el.classList.add(styles.hudPunch);
  }

  function resolveRowCollisions() {
    for (const row of world.rows) {
      if (row.resolved || row.y < LEADER_Y) continue;
      row.resolved = true;
      const isLeft = world.leaderX < VIEW_W / 2;
      const kind = isLeft ? row.left : row.right;
      const cellCenterX =
        (isLeft ? GATE_CELL_LEFT_X : GATE_CELL_RIGHT_X) + GATE_CELL_WIDTH / 2;
      applyGateEffect(kind, row.y, cellCenterX);
    }
  }

  function applyGateEffect(kind: GateKind, spawnY: number, spawnX: number) {
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
    setUnitCount(next);
    triggerHudPunch();

    if (next === 0) {
      setGamePhase("gameover");
    }
  }

  function updateProgress() {
    const percent = Math.min(
      100,
      Math.floor((world.distance / GOAL_DISTANCE) * 100),
    );
    if (percent !== progressPercent()) setProgressPercent(percent);
  }

  function spawnRowsIfNeeded() {
    while (
      world.distance >= world.nextRowDistance &&
      world.nextRowDistance < GOAL_DISTANCE - GOAL_SAFETY
    ) {
      const pattern = rollRowPattern(world.nextRowDistance, Math.random);
      const flip = Math.random() < 0.5;
      world.rows.push({
        y: -ROW_HEIGHT,
        left: flip ? pattern.a : pattern.b,
        right: flip ? pattern.b : pattern.a,
        resolved: false,
      });
      world.nextRowDistance += ROW_INTERVAL;
    }
  }

  function updateRows(dt: number) {
    const scrollDelta = SCROLL_SPEED * dt;
    for (const row of world.rows) row.y += scrollDelta;
    world.rows = world.rows.filter((row) => row.y < VIEW_H + ROW_HEIGHT);
  }

  function updateUnits(dt: number) {
    const wobbleBase = world.elapsed * WOBBLE_FREQ;
    const minX = LANE_MARGIN + UNIT_RADIUS;
    const maxX = VIEW_W - LANE_MARGIN - UNIT_RADIUS;

    for (const unit of world.units) {
      const wobble = Math.sin(wobbleBase + unit.wobblePhase) * WOBBLE_AMP;
      const targetX = clamp(world.leaderX + unit.offsetX + wobble, minX, maxX);
      const targetY = LEADER_Y + unit.offsetY;
      unit.x = dampLerp(unit.x, targetX, UNIT_FOLLOW_RATE, dt);
      unit.y = dampLerp(unit.y, targetY, UNIT_FOLLOW_RATE, dt);
    }
  }

  function updateTargetFromClientX(clientX: number) {
    const canvas = canvasRef;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const logicalX = ((clientX - rect.left) / rect.width) * VIEW_W;
    world.targetX = clamp(
      logicalX,
      LEADER_CLAMP_MARGIN,
      VIEW_W - LEADER_CLAMP_MARGIN,
    );
  }

  function handlePointerDown(e: PointerEvent) {
    if (gamePhase() !== "running") return;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    world.pointerActive = true;
    updateTargetFromClientX(e.clientX);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!world.pointerActive) return;
    updateTargetFromClientX(e.clientX);
  }

  function handlePointerUp() {
    world.pointerActive = false;
  }

  function render() {
    if (!ctx) return;
    drawBackground(ctx, images, world, theme);
    drawGoalLine(ctx, images, world, theme);
    drawGateRows(ctx, images, world, theme);
    drawUnits(ctx, images, world, theme);
    drawLeaderGlyph(ctx, images, world, theme);
    drawFloatTexts(ctx, world);
  }

  function frame(time: number) {
    if (lastTime !== undefined) {
      const dt = Math.min((time - lastTime) / 1000, MAX_DT);
      if (gamePhase() === "running") update(dt);
    }
    lastTime = time;
    render();
    rafId = requestAnimationFrame(frame);
  }

  onMount(() => {
    const canvas = canvasRef;
    if (!canvas) return;
    ctx = canvas.getContext("2d") ?? undefined;
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    rafId = requestAnimationFrame(frame);
  });

  onCleanup(() => {
    cancelAnimationFrame(rafId);
  });

  return (
    <div class={styles.root}>
      <div
        class={styles.frame}
        style={{
          "--player-color": theme.player.color,
          "--goal-color": theme.field.goalLineColor,
        }}
      >
        <canvas
          ref={canvasRef}
          class={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div class={styles.hud}>
          <div>
            <div class={styles.hudLabel}>{theme.hud.scoreLabel}</div>
            <div ref={hudValueRef} class={styles.hudValue}>
              {unitCount()}
            </div>
          </div>
          <div class={styles.progressTrack}>
            <div
              class={styles.progressFill}
              style={{ width: `${progressPercent()}%` }}
            />
          </div>
        </div>
        <Show when={gamePhase() === "cleared" || gamePhase() === "gameover"}>
          <div class={styles.overlay}>
            <div class={styles.overlayTitle}>
              {gamePhase() === "cleared"
                ? theme.overlay.clearTitle
                : theme.overlay.gameOverTitle}
            </div>
            <Show
              when={
                gamePhase() === "cleared"
                  ? theme.assets.overlayClear
                  : theme.assets.overlayGameOver
              }
            >
              {(asset) => (
                <img
                  src={asset().src}
                  width={asset().displayWidth}
                  height={asset().displayHeight}
                  alt=""
                />
              )}
            </Show>
            <div class={styles.overlayScore}>
              {theme.overlay.resultLabel}: {unitCount()}
            </div>
            <button type="button" class={styles.retryButton} onClick={retry}>
              {theme.overlay.retryLabel}
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default GamePrototype;

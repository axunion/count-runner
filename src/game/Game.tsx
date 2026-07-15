import { createSignal, onCleanup, onMount } from "solid-js";
import {
  DPR_CAP,
  LEADER_CLAMP_MARGIN,
  MAX_DT,
  VIEW_H,
  VIEW_W,
} from "./constants.ts";
import styles from "./Game.module.css";
import type { GamePhase } from "./logic/types.ts";
import { createWorldState, stepWorld } from "./logic/world.ts";
import {
  drawFloatTexts,
  drawGateRows,
  drawLeaderGlyph,
  drawUnits,
} from "./render/entities.ts";
import type { Viewport } from "./render/field.ts";
import { drawBackground, drawGoalLine } from "./render/field.ts";
import { loadThemeAssets } from "./theme/assetLoader.ts";
import theme from "./theme/themeConfig.ts";
import { Hud } from "./ui/Hud.tsx";
import { Overlay } from "./ui/Overlay.tsx";

const VIEWPORT: Viewport = { viewW: VIEW_W, viewH: VIEW_H };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function Game() {
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

  function triggerHudPunch() {
    const el = hudValueRef;
    if (!el) return;
    el.classList.remove(styles.hudPunch);
    void el.offsetWidth;
    el.classList.add(styles.hudPunch);
  }

  function update(dt: number) {
    const events = stepWorld(world, VIEWPORT, theme, dt, Math.random);

    if (events.gateResolved) {
      setUnitCount(events.gateResolved.newCount);
      triggerHudPunch();
    }
    if (events.progressPercent !== undefined) {
      setProgressPercent(events.progressPercent);
    }
    if (events.finished) {
      setGamePhase(events.finished);
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
    drawBackground(ctx, theme, images, VIEWPORT, world.distance);
    drawGoalLine(ctx, theme, images, VIEWPORT, world.distance);
    drawGateRows(ctx, theme, images, VIEWPORT, world.rows);
    drawUnits(ctx, theme, images, VIEWPORT, world.units, world.elapsed);
    drawLeaderGlyph(ctx, theme, images, VIEWPORT, world.leaderX, world.elapsed);
    drawFloatTexts(ctx, VIEWPORT, world.effects);
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
        <Hud
          theme={theme}
          unitCount={unitCount()}
          progressPercent={progressPercent()}
          valueRef={(el) => {
            hudValueRef = el;
          }}
        />
        <Overlay
          theme={theme}
          gamePhase={gamePhase()}
          unitCount={unitCount()}
          onRetry={retry}
        />
      </div>
    </div>
  );
}

export default Game;

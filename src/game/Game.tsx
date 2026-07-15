import { createSignal, onCleanup, onMount } from "solid-js";
import {
  BACKING_SCALE_CAP,
  DPR_CAP,
  LEADER_CLAMP_MARGIN,
  MAX_DT,
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
import { drawBackground, drawGoalLine } from "./render/field.ts";
import { loadThemeAssets } from "./theme/assetLoader.ts";
import theme from "./theme/themeConfig.ts";
import { Hud } from "./ui/Hud.tsx";
import { Overlay } from "./ui/Overlay.tsx";
import { computeScale, computeViewport } from "./viewport.ts";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const chromeBgImage = theme.chrome.backgroundImageSrc
  ? `url(${theme.chrome.backgroundImageSrc})`
  : "none";
const chromeSideImage = theme.chrome.sidePanelImageSrc
  ? `url(${theme.chrome.sidePanelImageSrc})`
  : "none";
const chromeFrameBorder = theme.chrome.frameBorderColor
  ? `2px solid ${theme.chrome.frameBorderColor}`
  : "none";

function Game() {
  let rootRef: HTMLDivElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let frameRef: HTMLDivElement | undefined;
  let hudValueRef: HTMLDivElement | undefined;
  let ctx: CanvasRenderingContext2D | undefined;
  let rafId = 0;
  let lastTime: number | undefined;
  let viewport = computeViewport(window.innerWidth, window.innerHeight);
  let world = createWorldState(viewport);
  const images = loadThemeAssets(theme.assets);
  const [unitCount, setUnitCount] = createSignal(world.units.length);
  const [progressPercent, setProgressPercent] = createSignal(0);
  const [gamePhase, setGamePhase] = createSignal<GamePhase>("running");

  function applyFrameLayout() {
    const frame = frameRef;
    if (!frame) return;
    frame.style.width = `${viewport.viewW * viewport.scale}px`;
    frame.style.height = `${viewport.viewH * viewport.scale}px`;
  }

  function applyBackingStore() {
    const canvas = canvasRef;
    if (!canvas) return;
    const dprCapped = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const total = Math.min(viewport.scale * dprCapped, BACKING_SCALE_CAP);
    canvas.width = Math.round(viewport.viewW * total);
    canvas.height = Math.round(viewport.viewH * total);
    ctx?.setTransform(total, 0, 0, total, 0, 0);
  }

  function applyLayout() {
    applyFrameLayout();
    applyBackingStore();
  }

  function handleResize() {
    viewport = {
      ...viewport,
      scale: computeScale(
        window.innerWidth,
        window.innerHeight,
        viewport.viewW,
        viewport.viewH,
      ),
    };
    applyLayout();
  }

  function retry() {
    viewport = computeViewport(window.innerWidth, window.innerHeight);
    world = createWorldState(viewport);
    applyLayout();
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
    const events = stepWorld(world, viewport, theme, dt, Math.random);

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
    drawBackground(ctx, theme, images, viewport, world.distance);
    drawGoalLine(ctx, theme, images, viewport, world.distance);
    drawGateRows(ctx, theme, images, viewport, world.rows);
    drawUnits(ctx, theme, images, viewport, world.units, world.elapsed);
    drawLeaderGlyph(ctx, theme, images, viewport, world.leaderX, world.elapsed);
    drawFloatTexts(ctx, viewport, world.effects);
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

    applyLayout();

    if (rootRef) {
      const observer = new ResizeObserver(handleResize);
      observer.observe(rootRef);
      onCleanup(() => observer.disconnect());
    }

    rafId = requestAnimationFrame(frame);
  });

  onCleanup(() => {
    cancelAnimationFrame(rafId);
  });

  return (
    <div
      ref={rootRef}
      class={styles.root}
      style={{
        "--chrome-bg-color": theme.chrome.backgroundColor,
        "--chrome-bg-image": chromeBgImage,
        "--chrome-side-image": chromeSideImage,
        "--chrome-frame-border": chromeFrameBorder,
      }}
    >
      <div class={styles.sidePanel} />
      <div
        ref={frameRef}
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
      <div class={styles.sidePanel} />
    </div>
  );
}

export default Game;

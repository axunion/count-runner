import {
  FLOAT_LIFETIME,
  GATE_CELL_LEFT_X,
  GATE_CELL_RIGHT_X,
  GATE_CELL_WIDTH,
  GLYPH_ROT_SPEED,
  LEADER_BOTTOM_OFFSET,
  LEADER_GLYPH_RADIUS,
  ROW_HEIGHT,
  UNIT_RADIUS,
} from "../constants.ts";
import type { FloatText, GateRow, Unit } from "../logic/types.ts";
import type { LoadedImages } from "../theme/assetLoader.ts";
import { getSprite } from "../theme/assetLoader.ts";
import type { GateKind, ThemeAssetConfig } from "../theme/themeConfig.ts";
import type { Viewport } from "../viewport.ts";

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
  theme: ThemeAssetConfig,
  images: LoadedImages,
  kind: GateKind,
  x: number,
  y: number,
  width: number,
  height: number,
  resolved: boolean,
) {
  const gate = theme.gates[kind];
  const sprite = getSprite(theme, images, GATE_ASSET_KEYS[kind]);
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

export function drawGateRows(
  ctx: CanvasRenderingContext2D,
  theme: ThemeAssetConfig,
  images: LoadedImages,
  _viewport: Viewport,
  rows: GateRow[],
) {
  for (const row of rows) {
    const cellY = row.y - ROW_HEIGHT / 2;
    for (const [x, kind] of [
      [GATE_CELL_LEFT_X, row.left],
      [GATE_CELL_RIGHT_X, row.right],
    ] as const) {
      drawGateCell(
        ctx,
        theme,
        images,
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

export function drawUnits(
  ctx: CanvasRenderingContext2D,
  theme: ThemeAssetConfig,
  images: LoadedImages,
  _viewport: Viewport,
  units: Unit[],
  elapsed: number,
) {
  const sprite = getSprite(theme, images, "unit");

  if (sprite) {
    const { asset, img } = sprite;
    const frameCount = asset.frameCount ?? 1;
    const fps = asset.fps ?? 8;
    const sourceFrameWidth = img.naturalWidth / frameCount;
    const sourceFrameHeight = img.naturalHeight;
    for (const unit of units) {
      const frame = Math.floor((elapsed * fps + unit.wobblePhase) % frameCount);
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

  ctx.fillStyle = theme.player.color;
  ctx.beginPath();
  for (const unit of units) {
    ctx.moveTo(unit.x + UNIT_RADIUS, unit.y);
    ctx.arc(unit.x, unit.y, UNIT_RADIUS, 0, Math.PI * 2);
  }
  ctx.fill();
}

export function drawLeaderGlyph(
  ctx: CanvasRenderingContext2D,
  theme: ThemeAssetConfig,
  images: LoadedImages,
  viewport: Viewport,
  leaderX: number,
  elapsed: number,
) {
  const sprite = getSprite(theme, images, "leaderGlyph");
  const rotation = elapsed * GLYPH_ROT_SPEED;
  const leaderY = viewport.viewH - LEADER_BOTTOM_OFFSET;

  ctx.save();
  ctx.translate(leaderX, leaderY);
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

  ctx.strokeStyle = theme.player.glyphColor;
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

export function drawFloatTexts(
  ctx: CanvasRenderingContext2D,
  _viewport: Viewport,
  effects: FloatText[],
) {
  for (const effect of effects) {
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

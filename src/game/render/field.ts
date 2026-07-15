import {
  GOAL_DISTANCE,
  LEADER_BOTTOM_OFFSET,
  STRIPE_INTERVAL,
} from "../constants.ts";
import type { LoadedImages } from "../theme/assetLoader.ts";
import { getSprite } from "../theme/assetLoader.ts";
import type { ThemeAssetConfig } from "../theme/themeConfig.ts";
import type { Viewport } from "../viewport.ts";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: ThemeAssetConfig,
  images: LoadedImages,
  viewport: Viewport,
  distance: number,
) {
  const { viewW, viewH } = viewport;
  const sprite = getSprite(theme, images, "background");

  if (sprite) {
    const tileHeight = sprite.asset.displayHeight;
    const offset = distance % tileHeight;
    let y = -offset;
    while (y < viewH) {
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

  ctx.fillStyle = theme.field.backgroundColor;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.strokeStyle = theme.field.stripeColor;
  ctx.lineWidth = 1;
  const stripeOffset = distance % STRIPE_INTERVAL;
  for (
    let y = -STRIPE_INTERVAL + stripeOffset;
    y < viewH;
    y += STRIPE_INTERVAL
  ) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewW, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(viewW / 2, 0);
  ctx.lineTo(viewW / 2, viewH);
  ctx.stroke();
  ctx.restore();
}

export function drawGoalLine(
  ctx: CanvasRenderingContext2D,
  theme: ThemeAssetConfig,
  images: LoadedImages,
  viewport: Viewport,
  distance: number,
) {
  const { viewW, viewH } = viewport;
  const leaderY = viewH - LEADER_BOTTOM_OFFSET;
  const goalY = leaderY - (GOAL_DISTANCE - distance);
  if (goalY <= -40 || goalY >= viewH + 40) return;

  const sprite = getSprite(theme, images, "goalBanner");

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

  ctx.strokeStyle = theme.field.goalLineColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, goalY);
  ctx.lineTo(viewW, goalY);
  ctx.stroke();

  ctx.fillStyle = theme.field.goalLineColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(theme.field.goalLabel, viewW / 2, goalY - 6);
}

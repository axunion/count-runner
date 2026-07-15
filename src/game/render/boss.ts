import { BOSS_SIZE, BOSS_Y, GUARD_DISPLAY_MAX } from "../constants.ts";
import { formationOffset } from "../logic/formation.ts";
import type { LoadedImages } from "../theme/assetLoader.ts";
import { getSprite } from "../theme/assetLoader.ts";
import type { ThemeAssetConfig } from "../theme/themeConfig.ts";

export function drawBoss(
  ctx: CanvasRenderingContext2D,
  theme: ThemeAssetConfig,
  images: LoadedImages,
  viewW: number,
  hp: number,
) {
  const sprite = getSprite(theme, images, "boss");
  const centerX = viewW / 2;
  const centerY = BOSS_Y;

  if (sprite) {
    ctx.drawImage(
      sprite.img,
      centerX - sprite.asset.displayWidth / 2,
      centerY - sprite.asset.displayHeight / 2,
      sprite.asset.displayWidth,
      sprite.asset.displayHeight,
    );
  } else {
    const radius = BOSS_SIZE / 2;
    ctx.fillStyle = theme.boss.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.boss.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.moveTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * (radius + 8),
        centerY + Math.sin(angle) * (radius + 8),
      );
    }
    ctx.stroke();
  }

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(theme.boss.hpLabel, centerX, centerY + BOSS_SIZE / 2 + 16);
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(String(hp), centerX, centerY + BOSS_SIZE / 2 + 36);
}

export function drawGuardCluster(
  ctx: CanvasRenderingContext2D,
  theme: ThemeAssetConfig,
  cellCenterX: number,
  cellBottomY: number,
  guard: number,
) {
  const clusterY = cellBottomY + 14;
  const displayCount = Math.min(guard, GUARD_DISPLAY_MAX);

  ctx.fillStyle = theme.enemy.color;
  ctx.beginPath();
  for (let i = 0; i < displayCount; i++) {
    const offset = formationOffset(i);
    const x = cellCenterX + offset.x * 0.5;
    const y = clusterY + offset.y * 0.5;
    ctx.moveTo(x + 3, y);
    ctx.arc(x, y, 3, 0, Math.PI * 2);
  }
  ctx.fill();

  const badgeX = cellCenterX + 26;
  const badgeY = clusterY - 8;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText(String(guard), badgeX, badgeY);
}

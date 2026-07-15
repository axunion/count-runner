import type { ThemeAssetConfig, ThemeAssets } from "./themeConfig.ts";

export type LoadedImages = Partial<Record<keyof ThemeAssets, HTMLImageElement>>;

export function loadThemeAssets(assets: ThemeAssets): LoadedImages {
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

export function getSprite<K extends keyof ThemeAssets>(
  themeConfig: ThemeAssetConfig,
  images: LoadedImages,
  key: K,
): { asset: NonNullable<ThemeAssets[K]>; img: HTMLImageElement } | undefined {
  const asset = themeConfig.assets[key];
  const img = asset && images[key];
  if (!asset || !img) return undefined;
  return { asset, img };
}

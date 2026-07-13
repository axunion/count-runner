export type GateKind = "add" | "multiply" | "subtract";

export interface PlayerConfig {
  readonly label: string;
  readonly color: string;
  readonly glyphColor: string;
}

export interface GateTypeConfig {
  readonly kind: GateKind;
  readonly label: string;
  readonly color: string;
  readonly value: number;
  readonly displayValue: string;
}

export interface HudConfig {
  readonly scoreLabel: string;
}

export interface OverlayConfig {
  readonly clearTitle: string;
  readonly gameOverTitle: string;
  readonly retryLabel: string;
  readonly resultLabel: string;
}

export interface FieldConfig {
  readonly backgroundColor: string;
  readonly stripeColor: string;
  readonly goalLineColor: string;
  readonly goalLabel: string;
}

export interface SpriteAsset {
  readonly src: string;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly frameCount?: number;
  readonly fps?: number;
}

export interface ThemeAssets {
  readonly unit?: SpriteAsset;
  readonly leaderGlyph?: SpriteAsset;
  readonly gateAdd?: SpriteAsset;
  readonly gateMultiply?: SpriteAsset;
  readonly gateSubtract?: SpriteAsset;
  readonly background?: SpriteAsset;
  readonly goalBanner?: SpriteAsset;
  readonly overlayClear?: SpriteAsset;
  readonly overlayGameOver?: SpriteAsset;
}

export interface ThemeAssetConfig {
  readonly name: string;
  readonly player: PlayerConfig;
  readonly gates: Record<GateKind, GateTypeConfig>;
  readonly hud: HudConfig;
  readonly overlay: OverlayConfig;
  readonly field: FieldConfig;
  readonly assets: ThemeAssets;
}

const fantasyTheme = {
  name: "Sword, Shield, and Sorcery",
  player: {
    label: "Apprentice Mage",
    color: "#1d4ed8",
    glyphColor: "#93c5fd",
  },
  gates: {
    add: {
      kind: "add",
      label: "Mana Font",
      color: "#10b981",
      value: 5,
      displayValue: "+5",
    },
    multiply: {
      kind: "multiply",
      label: "Chronos Gate",
      color: "#8b5cf6",
      value: 2,
      displayValue: "x2",
    },
    subtract: {
      kind: "subtract",
      label: "Gargoyle Wall",
      color: "#b91c1c",
      value: 3,
      displayValue: "-3",
    },
  },
  hud: {
    scoreLabel: "MANA POWER",
  },
  overlay: {
    clearTitle: "Quest Clear!",
    gameOverTitle: "The Party Has Fallen",
    retryLabel: "Retry",
    resultLabel: "MANA POWER",
  },
  field: {
    backgroundColor: "#0f172a",
    stripeColor: "#1e293b",
    goalLineColor: "#fbbf24",
    goalLabel: "SANCTUM",
  },
  assets: {},
} satisfies ThemeAssetConfig;

export default fantasyTheme as ThemeAssetConfig;

export type GateKind = "add" | "multiply" | "subtract";

export interface PlayerConfig {
  readonly label: string;
  readonly color: string;
  readonly glyphColor: string;
  readonly feverColor: string;
}

export interface GateTypeConfig {
  readonly kind: GateKind;
  readonly label: string;
  readonly color: string;
  readonly displayPrefix: string;
}

export interface EnemyConfig {
  readonly label: string;
  readonly color: string;
}

export interface BossConfig {
  readonly label: string;
  readonly color: string;
  readonly hpLabel: string;
}

export interface HudConfig {
  readonly scoreLabel: string;
  readonly comboLabel: string;
}

export interface OverlayConfig {
  readonly clearTitle: string;
  readonly gameOverTitle: string;
  readonly retryLabel: string;
  readonly resultLabel: string;
  readonly scoreLabel: string;
  readonly bestLabel: string;
  readonly newRecordLabel: string;
}

export interface FieldConfig {
  readonly backgroundColor: string;
  readonly stripeColor: string;
  readonly goalLineColor: string;
  readonly goalLabel: string;
}

export interface ChromeConfig {
  readonly backgroundColor: string;
  readonly backgroundImageSrc?: string;
  readonly sidePanelImageSrc?: string;
  readonly frameBorderColor?: string;
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
  readonly enemyUnit?: SpriteAsset;
  readonly leaderGlyph?: SpriteAsset;
  readonly gateAdd?: SpriteAsset;
  readonly gateMultiply?: SpriteAsset;
  readonly gateSubtract?: SpriteAsset;
  readonly boss?: SpriteAsset;
  readonly background?: SpriteAsset;
  readonly goalBanner?: SpriteAsset;
  readonly overlayClear?: SpriteAsset;
  readonly overlayGameOver?: SpriteAsset;
}

export interface ThemeAssetConfig {
  readonly name: string;
  readonly player: PlayerConfig;
  readonly gates: Record<GateKind, GateTypeConfig>;
  readonly enemy: EnemyConfig;
  readonly boss: BossConfig;
  readonly hud: HudConfig;
  readonly overlay: OverlayConfig;
  readonly field: FieldConfig;
  readonly chrome: ChromeConfig;
  readonly assets: ThemeAssets;
}

const fantasyTheme = {
  name: "Sword, Shield, and Sorcery",
  player: {
    label: "Apprentice Mage",
    color: "#1d4ed8",
    glyphColor: "#93c5fd",
    feverColor: "#fde047",
  },
  gates: {
    add: {
      kind: "add",
      label: "Mana Font",
      color: "#10b981",
      displayPrefix: "+",
    },
    multiply: {
      kind: "multiply",
      label: "Chronos Gate",
      color: "#8b5cf6",
      displayPrefix: "x",
    },
    subtract: {
      kind: "subtract",
      label: "Gargoyle Wall",
      color: "#b91c1c",
      displayPrefix: "-",
    },
  },
  enemy: {
    label: "Stone Legion",
    color: "#dc2626",
  },
  boss: {
    label: "Gate Guardian",
    color: "#7f1d1d",
    hpLabel: "GUARDIAN HP",
  },
  hud: {
    scoreLabel: "MANA POWER",
    comboLabel: "ARCANE CHAIN",
  },
  overlay: {
    clearTitle: "Quest Clear!",
    gameOverTitle: "The Party Has Fallen",
    retryLabel: "Retry",
    resultLabel: "MANA POWER",
    scoreLabel: "SCORE",
    bestLabel: "BEST",
    newRecordLabel: "NEW RECORD!",
  },
  field: {
    backgroundColor: "#0f172a",
    stripeColor: "#1e293b",
    goalLineColor: "#fbbf24",
    goalLabel: "SANCTUM",
  },
  chrome: {
    backgroundColor: "#020617",
  },
  assets: {},
} satisfies ThemeAssetConfig;

export default fantasyTheme as ThemeAssetConfig;

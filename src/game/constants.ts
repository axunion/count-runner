export const VIEW_W = 360;
export const VIEW_H_MIN = 640;
export const VIEW_H_MAX = 900;
export const DPR_CAP = 2;
export const BACKING_SCALE_CAP = 3;
export const MAX_DT = 1 / 30;
export const SCROLL_SPEED_BASE = 170;
export const SCROLL_SPEED_MAX = 250;
export const STRIPE_INTERVAL = 80;
export const LEADER_BOTTOM_OFFSET = 120;
export const BOSS_Y = 120;
export const BOSS_SIZE = 120;
export const LEADER_GLYPH_RADIUS = 14;
export const GLYPH_ROT_SPEED = 1.2;
export const LEADER_LERP_RATE = 12;
export const LEADER_CLAMP_MARGIN = 24;
export const KEYBOARD_MOVE_SPEED = 420;
export const SPAWN_JITTER = 20;
export const UNIT_FOLLOW_RATE = 8;
export const UNIT_RADIUS = 8;
export const FORMATION_SPACING = 12;
export const GOLDEN_ANGLE = 2.399963;
export const WOBBLE_AMP = 1.5;
export const WOBBLE_FREQ = 6;
export const LANE_MARGIN = 12;
export const INITIAL_UNITS = 10;
export const ROW_HEIGHT = 56;
export const GOAL_DISTANCE = 4600;
export const GOAL_SAFETY = 400;
export const PHASE2_START = 1400;
export const PHASE3_START = 3000;
export const MAX_UNITS = 120;
export const FLOAT_LIFETIME = 0.8;
export const FLOAT_RISE_SPEED = 45;
export const FLOAT_MULTIPLY_SCALE = 1.5;
export const GATE_CELL_GAP = 8;
export const GATE_BOUNDARY_DEFAULT = 180;
export const GATE_ASYM_OFFSET = 50;
export const GATE_BOUNDARY_MIN = 92;
export const GATE_BOUNDARY_MAX = 268;
export const GATE_OSC_AMP_MIN = 25;
export const GATE_OSC_AMP_MAX = 45;
export const GATE_OSC_PERIOD_MIN = 1.6;
export const GATE_OSC_PERIOD_MAX = 2.4;
export const FAST_ROW_RATE = 0.2;
export const FAST_ROW_SPEED_MULT = 1.4;
export const FAST_ROW_EXTRA_GAP_MULT = 1.4;
export const ROW_GAP_JITTER = 50;
export const ROW_CLUSTER_RATE = 0.15;
export const ROW_CLUSTER_GAP = 150;
export const ROW_BREATHER_RATE = 0.15;
export const ROW_BREATHER_MULT = 1.5;
export const RESOLVE_CHOSEN_HOLD = 0.35;
export const RESOLVE_RING_LIFETIME = 0.4;
export const RESOLVE_UNCHOSEN_FADE = 0.25;

export const ROW_GAP_BASE = {
  phase1: 300,
  phase2: 250,
  phase3: 220,
} as const;

export const GATE_OSC_RATES = {
  phase1: 0,
  phase2: 0.15,
  phase3: 0.3,
} as const;
export const GUARD_RATIO_MIN = 0.3;
export const GUARD_RATIO_MAX = 0.6;
export const GUARD_MIN = 3;
export const GUARD_DISPLAY_MAX = 20;

export const ROW_PATTERN_RATES = {
  phase1: {
    addVsBad: 0.7,
    multiplyVsBad: 0.2,
    multiplyVsAdd: 0.1,
    danger: 0,
    guarded: 0,
  },
  phase2: {
    addVsBad: 0.3,
    multiplyVsBad: 0.2,
    multiplyVsAdd: 0.3,
    danger: 0.1,
    guarded: 0.1,
  },
  phase3: {
    addVsBad: 0.2,
    multiplyVsBad: 0.15,
    multiplyVsAdd: 0.25,
    danger: 0.2,
    guarded: 0.2,
  },
} as const;

export const GATE_ADD_RANGES = {
  phase1: [2, 4],
  phase2: [3, 6],
  phase3: [4, 8],
} as const;

export const GATE_SUBTRACT_RANGES = {
  phase1: [1, 2],
  phase2: [2, 4],
  phase3: [3, 6],
} as const;

export const GATE_X3_RATES = {
  phase1: 0,
  phase2: 0.1,
  phase3: 0.15,
} as const;

export const COMBO_FEVER_THRESHOLD = 5;
export const FEVER_DURATION = 4;
export const FEVER_GAIN_MULT = 1.5;
export const FEVER_GLYPH_SCALE = 1.2;
export const BOSS_HP_BASE = 60;
export const BATTLE_DRAIN_RATE = 30;
export const SCORE_PER_UNIT = 10;
export const SCORE_PER_COMBO = 30;
export const BEST_STORAGE_KEY = "count-runner:best-v2.1";

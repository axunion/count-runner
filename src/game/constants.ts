export const VIEW_W = 360;
export const VIEW_H = 640;
export const DPR_CAP = 2;
export const MAX_DT = 1 / 30;
export const SCROLL_SPEED = 180;
export const STRIPE_INTERVAL = 80;
export const LEADER_Y = 520;
export const LEADER_GLYPH_RADIUS = 14;
export const GLYPH_ROT_SPEED = 1.2;
export const LEADER_LERP_RATE = 12;
export const LEADER_CLAMP_MARGIN = 24;
export const UNIT_FOLLOW_RATE = 8;
export const UNIT_RADIUS = 5;
export const FORMATION_SPACING = 7;
export const GOLDEN_ANGLE = 2.399963;
export const WOBBLE_AMP = 1.5;
export const WOBBLE_FREQ = 6;
export const LANE_MARGIN = 12;
export const INITIAL_UNITS = 10;
export const ROW_INTERVAL = 260;
export const ROW_HEIGHT = 56;
export const GOAL_DISTANCE = 6000;
export const GOAL_SAFETY = 400;
export const PHASE2_START = 2000;
export const PHASE3_START = 4200;
export const MAX_UNITS = 300;
export const FLOAT_LIFETIME = 0.8;
export const FLOAT_RISE_SPEED = 45;
export const FLOAT_MULTIPLY_SCALE = 1.5;
export const GATE_CELL_WIDTH = 164;
export const GATE_CELL_LEFT_X = 12;
export const GATE_CELL_RIGHT_X = 184;

export const ROW_PATTERN_RATES = {
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

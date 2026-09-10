/**
 * Global simulation constants. All spatial values are in fixed "units":
 *   UNIT (256) units == 1 rendered pixel.
 * The whole sim runs on integers at a fixed 60 Hz timestep so that two peers
 * running the same JS bundle stay bit-identical (lockstep netcode).
 */
export const FPS = 60;
export const UNIT = 256;

/** Internal render resolution (device-independent). */
export const VIEW_W = 480;
export const VIEW_H = 270;

/** Ground plane. Fighter position is the foot point; +y is up. */
export const FLOOR_Y = 0;

/** Default stage half-width from centre (units). Camera keeps both fighters framed. */
export const STAGE_HALF_WIDTH = 900 * UNIT;

/** Fighter cannot be pushed closer to a wall than this (units). */
export const WALL_MARGIN = 40 * UNIT;

/** Default push-box half width / height for a standing fighter (units). */
export const PUSHBOX_HALF_W = 22 * UNIT;
export const PUSHBOX_STAND_H = 90 * UNIT;
export const PUSHBOX_CROUCH_H = 56 * UNIT;
export const PUSHBOX_AIR_H = 60 * UNIT;

/** Default hurtbox (relative to foot origin, pre-facing-flip). */
export const HURT_STAND = { x: -20 * UNIT, y: 0, w: 40 * UNIT, h: 100 * UNIT };
export const HURT_CROUCH = { x: -22 * UNIT, y: 0, w: 44 * UNIT, h: 58 * UNIT };
export const HURT_AIR = { x: -20 * UNIT, y: 24 * UNIT, w: 40 * UNIT, h: 66 * UNIT };

/** Meter (super gauge). */
export const METER_MAX = 3000;
export const METER_PER_STOCK = 1000;
export const METER_ON_HIT_DEALT = 60;
export const METER_ON_HIT_TAKEN = 40;
export const METER_ON_BLOCK = 12;
export const METER_ON_WHIFF = 6;

/** Round / match. */
export const ROUND_TIME_SECONDS = 99;
export const ROUNDS_TO_WIN = 2;
export const INTRO_FRAMES = 90;
export const ROUND_END_FRAMES = 150;
export const KO_SLOWMO_FRAMES = 45;

/** Combo damage scaling: multiplier per extra hit, floored. */
export const SCALING_START_HIT = 3;
export const SCALING_STEP = 10; // percent removed per hit past the start
export const SCALING_MIN = 20; // never scale below 20%

/** Universal throw tech window (frames after being throw-hit that a throw can be broken). */
export const THROW_TECH_WINDOW = 5;

/** Chip damage as a fraction (percent) of blocked special/super damage. */
export const CHIP_PERCENT = 12;

/** Input history ring buffer length (frames) used for motion parsing. */
export const INPUT_HISTORY = 24;

/** Charge move: frames a direction must be held before release. */
export const CHARGE_FRAMES = 40;
/** Grace frames the charge stays valid after releasing the held direction. */
export const CHARGE_GRACE = 10;

/** Input bit flags. Directions are absolute (screen); "forward/back" derived from facing. */
export const IN = {
  UP: 1 << 0,
  DOWN: 1 << 1,
  LEFT: 1 << 2,
  RIGHT: 1 << 3,
  LP: 1 << 4,
  HP: 1 << 5,
  LK: 1 << 6,
  HK: 1 << 7,
  S1: 1 << 8, // stance / macro 1
  S2: 1 << 9, // puppet / macro 2
} as const;

export const BUTTON_BITS = IN.LP | IN.HP | IN.LK | IN.HK | IN.S1 | IN.S2;
export const DIR_BITS = IN.UP | IN.DOWN | IN.LEFT | IN.RIGHT;

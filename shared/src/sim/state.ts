import '../data/index.js'; // side-effect: ensure the roster is registered before any sim runs
import { getCharacter } from '../data/registry.js';
import {
  FLOOR_Y,
  INPUT_HISTORY,
  METER_MAX,
  ROUNDS_TO_WIN,
  ROUND_TIME_SECONDS,
  FPS,
  STAGE_HALF_WIDTH,
  UNIT,
} from './constants.js';
import { seedFromString } from './rng.js';
import type { FighterState, PuppetState, RoundConfig, SimState } from './types.js';

export interface MatchInit {
  p1: string;
  p2: string;
  seed: string | number;
  training?: boolean;
  roundTime?: number;
  roundsToWin?: number;
  stageHalfWidth?: number;
  /** Carry win counts across rounds. */
  wins?: [number, number];
  roundNumber?: number;
}

function freshPuppet(): PuppetState {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    state: 'idle',
    moveId: null,
    moveFrame: 0,
    life: 0,
  };
}

export function makeFighter(charId: string, index: 0 | 1, x: number, facing: 1 | -1): FighterState {
  const def = getCharacter(charId);
  return {
    charId,
    playerIndex: index,
    x,
    y: FLOOR_Y,
    vx: 0,
    vy: 0,
    facing,
    onGround: true,
    crouching: false,
    health: def.stats.maxHealth,
    maxHealth: def.stats.maxHealth,
    meter: 0,
    state: 'intro',
    stateFrame: 0,
    moveId: null,
    moveFrame: 0,
    moveConnected: 0,
    bufferedMoveId: null,
    bufferTimer: 0,
    landing: 0,
    hitstun: 0,
    blockstun: 0,
    hitstop: 0,
    comboCount: 0,
    comboHitsDealt: 0,
    jumpsUsed: 0,
    airActionsUsed: 0,
    prejumpHoldUp: false,
    chargeDb: 0,
    chargeBf: 0,
    chargeUd: 0,
    chargeDbReleased: 0,
    chargeBfReleased: 0,
    chargeUdReleased: 0,
    inputHistory: new Array(INPUT_HISTORY).fill(0),
    prevInput: 0,
    consumedHits: [],
    appliedHits: [],
    armorHitsLeft: 0,
    armorUntil: 0,
    invulnUntil: 0,
    invulnKind: 'none',
    stance: 'A',
    knockdown: false,
    wakeupTimer: 0,
    throwPartner: -1,
    throwTechTimer: 0,
    throwReleaseTimer: 0,
    throwKbx: 0,
    throwKby: 0,
    facingLocked: false,
    projCount: 0,
    puppet: freshPuppet(),
    winPose: 0,
    hitFlash: 0,
    blockFlash: 0,
    lastHitFrame: -999,
    dizzy: 0,
  };
}

export function createInitialState(init: MatchInit): SimState {
  const stageHalfWidth = init.stageHalfWidth ?? STAGE_HALF_WIDTH;
  const startX = 70 * UNIT;
  const config: RoundConfig = {
    roundTime: (init.roundTime ?? ROUND_TIME_SECONDS) * FPS,
    roundsToWin: init.roundsToWin ?? ROUNDS_TO_WIN,
    startX,
    stageHalfWidth,
    training: !!init.training,
  };
  const seed = typeof init.seed === 'number' ? init.seed >>> 0 : seedFromString(init.seed);
  return {
    frame: 0,
    rngState: seed,
    fighters: [
      makeFighter(init.p1, 0, -startX, 1),
      makeFighter(init.p2, 1, startX, -1),
    ],
    projectiles: [],
    nextEntityId: 1,
    cameraX: 0,
    roundTimer: config.roundTime,
    phase: 'intro',
    phaseFrame: 0,
    roundWinner: -1,
    wins: init.wins ? [init.wins[0], init.wins[1]] : [0, 0],
    roundNumber: init.roundNumber ?? 1,
    screenShake: 0,
    hitSparks: [],
    koSlowmo: 0,
    config,
    events: [],
  };
}

/** Full deep copy. Cheap enough at 60 Hz; also used by netcode checksum replay. */
export function cloneState(s: SimState): SimState {
  return structuredClone(s);
}

export { METER_MAX };

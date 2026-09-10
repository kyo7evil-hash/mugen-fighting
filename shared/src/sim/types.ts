/** Axis-aligned box, units, relative to a fighter's foot origin, pre-facing-flip. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Btn = 'LP' | 'HP' | 'LK' | 'HK' | 'S1' | 'S2';
export type MotionName =
  | 'qcf' // 236
  | 'qcb' // 214
  | 'dp' // 623
  | 'rdp' // 421
  | 'hcf' // 41236
  | 'hcb' // 63214
  | '360' // full circle (command grab)
  | 'dd' // 22 (down, down)
  | 'ff' // forward, forward (dash special)
  | 'bb'; // back, back

export type ChargeKind = 'db' | 'bf' | 'ud';
export type MoveContext = 'stand' | 'crouch' | 'air' | 'any';
export type MoveType = 'normal' | 'command' | 'special' | 'super' | 'throw';

export type Trigger =
  | { kind: 'normal'; button: Btn; ctx: MoveContext }
  | { kind: 'command'; button: Btn; dir: 'forward' | 'back' | 'down' | 'up'; ctx: MoveContext }
  | { kind: 'motion'; motion: MotionName; button: Btn; ctx: MoveContext }
  | { kind: 'charge'; charge: ChargeKind; button: Btn; ctx: MoveContext };

export interface HitDef {
  /** Frame window (inclusive) relative to move start where the hitbox is live. */
  from: number;
  to: number;
  box: Box;
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  /** Knockback in units/frame applied to victim. x is "away from attacker". */
  kbx: number;
  kby: number;
  /** Ground-bounce / launch behaviour. */
  launch?: boolean;
  /** Distinct id so a multi-hit move can hit the same target more than once. */
  hitId: number;
  low?: boolean;
  overhead?: boolean;
  unblockable?: boolean;
  grab?: boolean;
  airGrab?: boolean;
  projectile?: boolean;
  /** Extra pushback applied to the attacker on block. */
  blockPush?: number;
  /** Meter awarded to attacker on connect (overrides default). */
  meterHit?: number;
}

export interface ProjectileSpawn {
  frame: number;
  kind: string; // visual key
  /** Offset from attacker foot origin (pre-flip). */
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  hits: number; // how many times it can hit before despawn
  box: Box;
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  kbx: number;
  kby: number;
  gravity?: number;
  /** If set, projectile counts against the owner's on-screen projectile cap. */
  capped?: boolean;
}

export interface SelfVel {
  frame: number;
  x?: number;
  y?: number;
  mode?: 'set' | 'add';
}

export interface Move {
  id: string;
  name: string;
  type: MoveType;
  trigger: Trigger;
  startup: number;
  active: number;
  recovery: number;
  duration: number;
  airOk?: boolean;
  landingRecovery?: number;
  hits: HitDef[];
  hurtbox?: Box; // overrides default stance hurtbox for the whole move
  /** Frame window in which a connected hit can be cancelled into another move. */
  cancelWindow?: [number, number];
  cancelInto?: string[]; // move ids, or tags: 'special' | 'super' | 'jump' | 'dash'
  meterCost?: number;
  minMeterToUse?: number;
  spawns?: ProjectileSpawn[];
  selfVel?: SelfVel[];
  /** Hyper-armor window [from,to]; absorbs `armorHits` strikes (still takes damage). */
  armor?: [number, number];
  armorHits?: number;
  /** Invulnerability window [from,to]. */
  invuln?: [number, number];
  invulnKind?: 'all' | 'strike' | 'throw' | 'air';
  gainOnWhiff?: number;
  stanceOnly?: 'A' | 'B';
  /** When started, this move just flips the fighter's stance (no attack). */
  stanceToggle?: boolean;
  /** Marks the move as a launcher combo starter for AI. */
  starter?: boolean;
  /** Costs the user health on activation (e.g. some supers / puppet). */
  healthCost?: number;
  /** Puppet control move. */
  puppet?: 'summon' | 'command' | 'recall';
}

export type FStateName =
  | 'intro'
  | 'idle'
  | 'walk'
  | 'backwalk'
  | 'crouch'
  | 'jumpsquat'
  | 'air'
  | 'dash'
  | 'backdash'
  | 'airdash'
  | 'blockstand'
  | 'blockcrouch'
  | 'blockair'
  | 'attack'
  | 'hitstun'
  | 'airhitstun'
  | 'blockstun'
  | 'knockdown'
  | 'wakeup'
  | 'thrown'
  | 'throwhold'
  | 'stancechange'
  | 'win'
  | 'ko';

export interface PuppetState {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  state: 'idle' | 'move' | 'recover';
  moveId: string | null;
  moveFrame: number;
  life: number;
}

export interface FighterState {
  charId: string;
  playerIndex: 0 | 1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  crouching: boolean;
  health: number;
  maxHealth: number;
  meter: number;
  state: FStateName;
  stateFrame: number;
  moveId: string | null;
  moveFrame: number;
  /** 0 = not connected, 1 = hit, 2 = blocked. Enables cancels. */
  moveConnected: 0 | 1 | 2;
  /** Buffered special/super to fire as soon as the fighter is actionable. */
  bufferedMoveId: string | null;
  bufferTimer: number;
  landing: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  /** Combo the fighter is CURRENTLY receiving (resets when they recover). */
  comboCount: number;
  /** Hits dealt in the current combo string by this fighter (for damage scaling). */
  comboHitsDealt: number;
  jumpsUsed: number;
  airActionsUsed: number;
  prejumpHoldUp: boolean;
  chargeDb: number;
  chargeBf: number;
  chargeUd: number;
  chargeDbReleased: number;
  chargeBfReleased: number;
  chargeUdReleased: number;
  inputHistory: number[];
  prevInput: number;
  /** Hit tokens consumed during the current hitstun chain (prevents re-hit). */
  consumedHits: number[];
  /** hitIds already applied by the CURRENT move instance (reset on move start). */
  appliedHits: number[];
  armorHitsLeft: number;
  armorUntil: number;
  invulnUntil: number;
  invulnKind: 'all' | 'strike' | 'throw' | 'air' | 'none';
  stance: 'A' | 'B';
  knockdown: boolean;
  wakeupTimer: number;
  throwPartner: number; // -1 none, else other fighter index; means locked in throw anim
  throwTechTimer: number;
  /** >0 while this fighter is holding a throw victim; releases at 0. */
  throwReleaseTimer: number;
  throwKbx: number;
  throwKby: number;
  facingLocked: boolean;
  projCount: number;
  puppet: PuppetState;
  winPose: number;
  hitFlash: number;
  blockFlash: number;
  /** Last frame this fighter landed a hit (for combo tracking / AI). */
  lastHitFrame: number;
  dizzy: number;
}

export interface Projectile {
  id: number;
  owner: 0 | 1;
  kind: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  hitsLeft: number;
  box: Box;
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  kbx: number;
  kby: number;
  facing: 1 | -1;
  capped: boolean;
  hitTargets: number[];
}

export interface HitSpark {
  x: number;
  y: number;
  life: number;
  kind: 'hit' | 'block' | 'clash' | 'ko' | 'counter';
  big: boolean;
}

export interface RoundConfig {
  roundTime: number;
  roundsToWin: number;
  startX: number; // absolute spawn offset from centre
  stageHalfWidth: number;
  training: boolean;
}

export type MatchPhase = 'intro' | 'fight' | 'roundend' | 'matchend';

export interface SimState {
  frame: number;
  rngState: number;
  fighters: [FighterState, FighterState];
  projectiles: Projectile[];
  nextEntityId: number;
  cameraX: number;
  roundTimer: number;
  phase: MatchPhase;
  phaseFrame: number;
  roundWinner: -1 | 0 | 1;
  wins: [number, number];
  roundNumber: number;
  screenShake: number;
  hitSparks: HitSpark[];
  koSlowmo: number;
  config: RoundConfig;
  /** Set on the frame a hit/block/ko happens so the renderer/audio can react. */
  events: SimEvent[];
}

export type SimEvent =
  | { t: 'hit'; attacker: 0 | 1; damage: number; combo: number; counter: boolean; charId: string }
  | { t: 'block'; defender: 0 | 1 }
  | { t: 'throw'; attacker: 0 | 1 }
  | { t: 'super'; attacker: 0 | 1; charId: string }
  | { t: 'projectile'; owner: 0 | 1 }
  | { t: 'ko'; loser: 0 | 1 }
  | { t: 'roundstart' }
  | { t: 'roundend'; winner: -1 | 0 | 1 }
  | { t: 'matchend'; winner: 0 | 1 }
  | { t: 'whiff'; attacker: 0 | 1 };

/** Per-frame controller output for one fighter (bitmask of IN.*). */
export type InputBits = number;

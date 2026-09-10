import { getCharacter, getMove } from '../data/registry.js';
import type { CharStats } from '../data/types.js';
import {
  BUTTON_BITS,
  CHARGE_FRAMES,
  CHARGE_GRACE,
  CHIP_PERCENT,
  FLOOR_Y,
  FPS,
  HURT_AIR,
  HURT_CROUCH,
  HURT_STAND,
  IN,
  INPUT_HISTORY,
  INTRO_FRAMES,
  KO_SLOWMO_FRAMES,
  METER_MAX,
  METER_ON_BLOCK,
  METER_ON_HIT_DEALT,
  METER_ON_HIT_TAKEN,
  METER_ON_WHIFF,
  PUSHBOX_AIR_H,
  PUSHBOX_CROUCH_H,
  PUSHBOX_HALF_W,
  PUSHBOX_STAND_H,
  ROUND_END_FRAMES,
  SCALING_MIN,
  SCALING_START_HIT,
  SCALING_STEP,
  UNIT,
  VIEW_W,
} from './constants.js';
import { detectMotion, pressed, relDir } from './motion.js';
import { rectsOverlap, toWorld, type Rect } from './boxes.js';
import { makeFighter } from './state.js';
import type {
  Btn,
  FighterState,
  HitDef,
  InputBits,
  Move,
  Projectile,
  SimEvent,
  SimState,
} from './types.js';

const LAUNCH_VY = 9 * UNIT;
const THROW_RANGE = 46 * UNIT;
const THROW_HOLD_DIST = 34 * UNIT;
const KNOCKDOWN_FRAMES = 26;
const WAKEUP_INVULN = 6;

const BTN_BIT: Record<Btn, number> = {
  LP: IN.LP,
  HP: IN.HP,
  LK: IN.LK,
  HK: IN.HK,
  S1: IN.S1,
  S2: IN.S2,
};

type Inputs = readonly [InputBits, InputBits];

export function step(prev: SimState, inputs: Inputs): SimState {
  const s = structuredClone(prev) as SimState;
  s.frame++;
  s.events = [];

  // decay cosmetics
  if (s.screenShake > 0) s.screenShake--;
  if (s.koSlowmo > 0) s.koSlowmo--;
  for (const sp of s.hitSparks) sp.life--;
  s.hitSparks = s.hitSparks.filter((sp) => sp.life > 0);

  pushInputHistory(s.fighters[0], inputs[0]);
  pushInputHistory(s.fighters[1], inputs[1]);
  updateCharge(s.fighters[0], inputs[0]);
  updateCharge(s.fighters[1], inputs[1]);

  if (s.phase === 'intro') {
    s.phaseFrame++;
    for (const f of s.fighters) {
      f.state = 'intro';
      f.x = clampWall(s, f.x);
    }
    if (s.phaseFrame >= INTRO_FRAMES) {
      s.phase = 'fight';
      s.phaseFrame = 0;
      for (const f of s.fighters) f.state = 'idle';
      s.events.push({ t: 'roundstart' });
    }
    return s;
  }

  if (s.phase === 'roundend') {
    s.phaseFrame++;
    stepPhysicsOnly(s);
    if (s.phaseFrame >= ROUND_END_FRAMES) endRoundResolve(s);
    return s;
  }

  if (s.phase === 'matchend') {
    s.phaseFrame++;
    stepPhysicsOnly(s);
    return s;
  }

  // ---- phase: fight ----
  for (let i = 0 as 0 | 1; i < 2; i = (i + 1) as 0 | 1) {
    const f = s.fighters[i];
    const opp = s.fighters[(1 - i) as 0 | 1];
    tickTimers(f);
    if (f.hitstop > 0) continue;
    faceOpponent(f, opp);
    updateFighter(s, f, opp, inputs[i], i);
    updatePuppet(s, f, opp, i);
  }

  // physics + push separation
  for (const f of s.fighters) integratePhysics(s, f);
  separatePushboxes(s);

  // projectiles
  stepProjectiles(s);

  // combat
  for (let i = 0 as 0 | 1; i < 2; i = (i + 1) as 0 | 1) {
    resolveMelee(s, i, (1 - i) as 0 | 1);
  }

  // round-over checks
  checkRoundOver(s);

  updateCamera(s);
  s.frame % 1 === 0 && clampMeters(s);
  return s;
}

// ---------------------------------------------------------------------------
// input plumbing
// ---------------------------------------------------------------------------

function pushInputHistory(f: FighterState, bits: InputBits): void {
  f.prevInput = f.inputHistory[f.inputHistory.length - 1] ?? 0;
  f.inputHistory.push(bits);
  if (f.inputHistory.length > INPUT_HISTORY) f.inputHistory.shift();
}

function curInput(f: FighterState): number {
  return f.inputHistory[f.inputHistory.length - 1] ?? 0;
}

function updateCharge(f: FighterState, bits: InputBits): void {
  const left = (bits & IN.LEFT) !== 0;
  const right = (bits & IN.RIGHT) !== 0;
  const down = (bits & IN.DOWN) !== 0;
  const up = (bits & IN.UP) !== 0;
  const back = f.facing === 1 ? left : right;
  const fwd = f.facing === 1 ? right : left;

  // db charge (down-back held)
  if (down && back) f.chargeDb = Math.min(CHARGE_FRAMES + CHARGE_GRACE, f.chargeDb + 1);
  else if (f.chargeDb >= CHARGE_FRAMES) f.chargeDbReleased = CHARGE_GRACE;
  else f.chargeDb = Math.max(0, f.chargeDb - 2);

  // bf charge (back held -> forward)
  if (back) f.chargeBf = Math.min(CHARGE_FRAMES + CHARGE_GRACE, f.chargeBf + 1);
  else if (f.chargeBf >= CHARGE_FRAMES) f.chargeBfReleased = CHARGE_GRACE;
  else f.chargeBf = Math.max(0, f.chargeBf - 2);

  // ud charge (down held -> up)
  if (down) f.chargeUd = Math.min(CHARGE_FRAMES + CHARGE_GRACE, f.chargeUd + 1);
  else if (f.chargeUd >= CHARGE_FRAMES) f.chargeUdReleased = CHARGE_GRACE;
  else f.chargeUd = Math.max(0, f.chargeUd - 2);

  if (f.chargeDbReleased > 0 && !(down && back)) f.chargeDbReleased--;
  if (f.chargeBfReleased > 0 && !back) f.chargeBfReleased--;
  if (f.chargeUdReleased > 0 && !down) f.chargeUdReleased--;
  void fwd;
  void up;
}

// ---------------------------------------------------------------------------
// per-fighter update
// ---------------------------------------------------------------------------

function tickTimers(f: FighterState): void {
  if (f.hitstop > 0) {
    f.hitstop--;
    return;
  }
  if (f.blockFlash > 0) f.blockFlash--;
  if (f.hitFlash > 0) f.hitFlash--;
  if (f.throwTechTimer > 0) f.throwTechTimer--;
  if (f.bufferTimer > 0) {
    f.bufferTimer--;
    if (f.bufferTimer === 0) f.bufferedMoveId = null;
  }
  if (f.dizzy > 0) f.dizzy--;
  f.stateFrame++;
}

function faceOpponent(f: FighterState, opp: FighterState): void {
  if (f.facingLocked || f.throwPartner >= 0) return;
  const locked =
    f.state === 'attack' ||
    f.state === 'hitstun' ||
    f.state === 'airhitstun' ||
    f.state === 'blockstun' ||
    f.state === 'knockdown' ||
    f.state === 'dash' ||
    f.state === 'backdash';
  if (locked) return;
  if (opp.x > f.x + 2 * UNIT) f.facing = 1;
  else if (opp.x < f.x - 2 * UNIT) f.facing = -1;
}

function actionable(f: FighterState): boolean {
  if (f.hitstop > 0 || f.landing > 0 || f.throwPartner >= 0) return false;
  switch (f.state) {
    case 'idle':
    case 'walk':
    case 'backwalk':
    case 'crouch':
    case 'air':
      return true;
    case 'dash':
    case 'backdash':
      return f.stateFrame >= 9;
    default:
      return false;
  }
}

function updateFighter(
  s: SimState,
  f: FighterState,
  opp: FighterState,
  bits: InputBits,
  idx: 0 | 1,
): void {
  const def = getCharacter(f.charId);
  const st = def.stats;
  const cur = bits;
  const prev = f.prevInput;
  const rd = relDir(cur, f.facing);
  const holdBack = rd === 4 || rd === 1 || rd === 7;
  const holdFwd = rd === 6 || rd === 3 || rd === 9;
  const holdDown = rd === 2 || rd === 1 || rd === 3;
  const holdUp = rd === 8 || rd === 7 || rd === 9;

  // --- recovering states ---
  if (f.state === 'hitstun' || f.state === 'blockstun') {
    if (f.hitstun > 0) f.hitstun--;
    if (f.blockstun > 0) f.blockstun--;
    // allow buffering a reversal
    tryBuffer(s, f, opp, cur, prev, idx);
    if (f.hitstun <= 0 && f.blockstun <= 0) {
      f.state = f.onGround ? 'idle' : 'air';
      f.consumedHits.length = 0;
      if (f.onGround) f.comboCount = 0;
      tryFireBuffered(s, f, opp, idx);
    }
    return;
  }
  if (f.state === 'airhitstun') {
    if (f.hitstun > 0) f.hitstun--;
    return; // recovers on landing (integratePhysics -> knockdown)
  }
  if (f.state === 'knockdown') {
    f.wakeupTimer--;
    if (f.wakeupTimer <= 0) {
      f.state = 'idle';
      f.knockdown = false;
      f.invulnUntil = s.frame + WAKEUP_INVULN;
      f.invulnKind = 'all';
      f.consumedHits.length = 0;
      f.comboCount = 0;
    }
    return;
  }
  if (f.state === 'thrown') {
    // held by opponent; position slaved in resolveMelee / here
    if (opp.throwPartner === idx) {
      f.x = clampWall(s, opp.x + opp.facing * THROW_HOLD_DIST);
      f.facing = (-opp.facing) as 1 | -1;
    }
    return;
  }
  if (f.state === 'blockstand' || f.state === 'blockcrouch' || f.state === 'blockair') {
    if (f.blockstun > 0) f.blockstun--;
    if (f.blockstun <= 0) f.state = f.onGround ? 'idle' : 'air';
    return;
  }
  if (f.state === 'stancechange') {
    if (f.stateFrame >= 14) {
      f.stance = f.stance === 'A' ? 'B' : 'A';
      f.state = 'idle';
    }
    return;
  }

  // --- attack in progress ---
  if (f.state === 'attack') {
    advanceAttack(s, f, opp, cur, prev, idx);
    return;
  }

  // --- jumpsquat: pre-jump frames then launch ---
  if (f.state === 'jumpsquat') {
    if (f.stateFrame >= st.prejump) {
      f.onGround = false;
      f.jumpsUsed = 1;
      f.airActionsUsed = 0;
      f.vy = st.jumpVy;
      const jx = Math.round(st.walkFwd * 1.9);
      f.vx = holdFwd ? jx * f.facing : holdBack ? -jx * f.facing : 0;
      f.state = 'air';
      f.stateFrame = 0;
    }
    return;
  }

  // --- dash / backdash: coast, allow attack-cancel ---
  if (f.state === 'dash' || f.state === 'backdash') {
    const dur = f.state === 'dash' ? st.dashFwdFrames : st.backdashFrames;
    if (f.stateFrame >= 6) {
      const act = resolveAction(s, f, opp, cur, prev, idx);
      if (act) {
        startMove(s, f, act, idx);
        return;
      }
    }
    if (f.state === 'dash') f.vx = st.dashFwd * f.facing;
    if (f.stateFrame >= dur) f.state = f.onGround ? 'idle' : 'air';
    return;
  }
  if (f.state === 'airdash') {
    if (f.stateFrame >= 18) f.state = 'air';
    return;
  }

  if (!actionable(f)) return;

  // attacks take priority over movement
  const action = resolveAction(s, f, opp, cur, prev, idx);
  if (action) {
    startMove(s, f, action, idx);
    return;
  }

  // jump (rising edge of up)
  if (pressed(cur, prev, IN.UP)) {
    if (f.onGround) {
      f.state = 'jumpsquat';
      f.stateFrame = 0;
      f.crouching = false;
      return;
    }
    if (f.jumpsUsed < st.jumps) {
      f.jumpsUsed++;
      f.vy = st.jumpVy;
      f.vx = holdFwd
        ? st.walkFwd * 2 * f.facing
        : holdBack
          ? -st.walkBack * 2 * f.facing
          : f.vx >> 1;
      f.state = 'air';
      f.stateFrame = 0;
      return;
    }
  }

  if (!f.onGround) {
    if (holdFwd) f.vx = approach(f.vx, st.airMoveX * f.facing, UNIT >> 1);
    else if (holdBack) f.vx = approach(f.vx, -st.airMoveX * f.facing, UNIT >> 1);
    if (
      st.airdash !== 'none' &&
      f.airActionsUsed < 1 &&
      detectMotion(f.inputHistory, f.facing, 'ff')
    ) {
      f.vx = f.facing * st.dashFwd;
      f.vy = Math.max(f.vy, 0);
      f.airActionsUsed++;
      f.state = 'airdash';
      f.stateFrame = 0;
    } else if (
      st.airdash === 'free' &&
      f.airActionsUsed < 1 &&
      detectMotion(f.inputHistory, f.facing, 'bb')
    ) {
      f.vx = -f.facing * st.dashFwd;
      f.airActionsUsed++;
      f.state = 'airdash';
      f.stateFrame = 0;
    }
    return;
  }

  // ground dashes
  if (detectMotion(f.inputHistory, f.facing, 'ff')) {
    f.state = 'dash';
    f.stateFrame = 0;
    f.vx = st.dashFwd * f.facing;
    return;
  }
  if (detectMotion(f.inputHistory, f.facing, 'bb')) {
    f.state = 'backdash';
    f.stateFrame = 0;
    f.vx = -st.dashBack * f.facing;
    f.invulnUntil = s.frame + st.backdashInvuln;
    f.invulnKind = 'all';
    return;
  }

  // walk / crouch / idle
  if (holdDown) {
    f.crouching = true;
    f.state = 'crouch';
    f.vx = decel(f.vx, UNIT);
  } else if (holdFwd) {
    f.crouching = false;
    f.state = 'walk';
    f.vx = st.walkFwd * f.facing;
  } else if (holdBack) {
    f.crouching = false;
    f.state = 'backwalk';
    f.vx = -st.walkBack * f.facing;
  } else {
    f.crouching = false;
    f.state = 'idle';
    f.vx = decel(f.vx, UNIT);
  }
  void holdUp;
}

function approach(v: number, target: number, rate: number): number {
  if (v < target) return Math.min(target, v + rate);
  if (v > target) return Math.max(target, v - rate);
  return v;
}
function decel(v: number, rate: number): number {
  if (v > 0) return Math.max(0, v - rate);
  if (v < 0) return Math.min(0, v + rate);
  return v;
}

// ---------------------------------------------------------------------------
// action resolution
// ---------------------------------------------------------------------------

function ctxOf(f: FighterState, holdDown: boolean): 'stand' | 'crouch' | 'air' {
  if (!f.onGround) return 'air';
  return holdDown ? 'crouch' : 'stand';
}

function triggerMatches(
  m: Move,
  f: FighterState,
  cur: number,
  prev: number,
  ctx: 'stand' | 'crouch' | 'air',
): boolean {
  const t = m.trigger;
  if (t.ctx !== 'any' && t.ctx !== ctx) return false;
  if (m.stanceOnly && ((m.stanceOnly === 'A') !== (f.stance === 'A'))) return false;
  const btn = BTN_BIT[t.button as Btn];
  if (t.kind === 'normal') {
    return pressed(cur, prev, btn);
  }
  if (t.kind === 'command') {
    if (!pressed(cur, prev, btn)) return false;
    const rd = relDir(cur, f.facing);
    if (t.dir === 'forward') return rd === 6 || rd === 3 || rd === 9;
    if (t.dir === 'back') return rd === 4 || rd === 1 || rd === 7;
    if (t.dir === 'down') return rd === 2 || rd === 1 || rd === 3;
    return rd === 8 || rd === 7 || rd === 9;
  }
  if (t.kind === 'motion') {
    if (!pressed(cur, prev, btn)) return false;
    return detectMotion(f.inputHistory, f.facing, t.motion);
  }
  // charge
  if (!pressed(cur, prev, btn)) return false;
  if (t.charge === 'db') return f.chargeDbReleased > 0 || (f.chargeDb >= CHARGE_FRAMES);
  if (t.charge === 'bf') return f.chargeBfReleased > 0 || (f.chargeBf >= CHARGE_FRAMES);
  return f.chargeUdReleased > 0 || (f.chargeUd >= CHARGE_FRAMES);
}

function canAfford(f: FighterState, m: Move): boolean {
  if (m.meterCost && f.meter < m.meterCost) return false;
  if (m.minMeterToUse && f.meter < m.minMeterToUse) return false;
  if (m.healthCost && f.health <= m.healthCost + 1) return false;
  return true;
}

function resolveAction(
  s: SimState,
  f: FighterState,
  opp: FighterState,
  cur: number,
  prev: number,
  idx: 0 | 1,
): Move | null {
  const def = getCharacter(f.charId);
  const rd = relDir(cur, f.facing);
  const holdDown = rd === 2 || rd === 1 || rd === 3;
  const ctx = ctxOf(f, holdDown);

  // universal throw: LP+LK (fresh) close & grounded
  if (
    ctx !== 'air' &&
    ((pressed(cur, prev, IN.LP) && (cur & IN.LK) !== 0) ||
      (pressed(cur, prev, IN.LK) && (cur & IN.LP) !== 0))
  ) {
    if (
      opp.onGround &&
      opp.throwPartner < 0 &&
      Math.abs(opp.x - f.x) < THROW_RANGE &&
      !invulnActive(opp, s.frame, true) &&
      opp.state !== 'knockdown' &&
      opp.state !== 'thrown'
    ) {
      const dir = rd === 4 || rd === 1 || rd === 7 ? 'back' : 'forward';
      return universalThrow(dir);
    }
  }

  const order: Move['type'][] = ['super', 'special', 'command', 'normal'];
  for (const ty of order) {
    for (const m of def.moves) {
      if (m.type !== ty) continue;
      if (m.airOk === false && ctx === 'air') continue;
      if (!m.airOk && ctx === 'air' && m.trigger.ctx !== 'air' && m.trigger.ctx !== 'any') continue;
      if (!canAfford(f, m)) continue;
      if (triggerMatches(m, f, cur, prev, ctx)) return m;
    }
  }
  void opp;
  void idx;
  return null;
}

let THROW_HID = 90000;
function universalThrow(dir: 'forward' | 'back'): Move {
  const away = dir === 'back' ? -1 : 1;
  return {
    id: dir === 'back' ? 'throw_b' : 'throw_f',
    name: 'Throw',
    type: 'throw',
    trigger: { kind: 'normal', button: 'LP', ctx: 'stand' },
    startup: 3,
    active: 2,
    recovery: 20,
    duration: 26,
    hits: [
      {
        from: 3,
        to: 4,
        box: { x: 0, y: 20 * UNIT, w: THROW_RANGE, h: 60 * UNIT },
        damage: 120,
        hitstun: 40,
        blockstun: 0,
        hitstop: 10,
        kbx: away * 7 * UNIT,
        kby: 5 * UNIT,
        grab: true,
        launch: true,
        hitId: THROW_HID++,
      },
    ],
    selfVel: [],
  };
}

function tryBuffer(
  s: SimState,
  f: FighterState,
  opp: FighterState,
  cur: number,
  prev: number,
  idx: 0 | 1,
): void {
  const def = getCharacter(f.charId);
  for (const ty of ['super', 'special'] as const) {
    for (const m of def.moves) {
      if (m.type !== ty || !canAfford(f, m)) continue;
      const ctx = f.onGround ? 'stand' : 'air';
      if (triggerMatches(m, f, cur, prev, ctx)) {
        f.bufferedMoveId = m.id;
        f.bufferTimer = 10;
        return;
      }
    }
  }
  void s;
  void opp;
  void idx;
}

function tryFireBuffered(s: SimState, f: FighterState, opp: SimState['fighters'][0], idx: 0 | 1): void {
  if (!f.bufferedMoveId) return;
  const m = getMove(f.charId, f.bufferedMoveId);
  f.bufferedMoveId = null;
  f.bufferTimer = 0;
  if (!m || !canAfford(f, m)) return;
  startMove(s, f, m, idx);
  void opp;
}

// ---------------------------------------------------------------------------
// move execution
// ---------------------------------------------------------------------------

function startMove(s: SimState, f: FighterState, m: Move, idx: 0 | 1): void {
  if (m.stanceToggle) {
    f.state = 'stancechange';
    f.stateFrame = 0;
    f.moveId = null;
    f.vx = decel(f.vx, UNIT * 2);
    return;
  }
  f.state = 'attack';
  f.moveId = m.id;
  f.moveFrame = 0;
  f.stateFrame = 0;
  f.moveConnected = 0;
  f.appliedHits.length = 0;
  if (m.meterCost) f.meter = Math.max(0, f.meter - m.meterCost);
  if (m.healthCost) f.health = Math.max(1, f.health - m.healthCost);
  if (m.type === 'super') s.events.push({ t: 'super', attacker: idx, charId: f.charId });
  if (f.onGround && m.trigger.ctx !== 'air') f.vx = decel(f.vx, UNIT * 2);
  // consume charge if it was a charge move
  if (m.trigger.kind === 'charge') {
    if (m.trigger.charge === 'db') (f.chargeDb = 0), (f.chargeDbReleased = 0);
    if (m.trigger.charge === 'bf') (f.chargeBf = 0), (f.chargeBfReleased = 0);
    if (m.trigger.charge === 'ud') (f.chargeUd = 0), (f.chargeUdReleased = 0);
  }
  if (m.puppet) applyPuppet(s, f, m, idx);
}

function advanceAttack(
  s: SimState,
  f: FighterState,
  opp: FighterState,
  cur: number,
  prev: number,
  idx: 0 | 1,
): void {
  const m = f.moveId ? getMove(f.charId, f.moveId) : null;
  if (!m) {
    f.state = f.onGround ? 'idle' : 'air';
    f.moveId = null;
    return;
  }
  f.moveFrame++;

  // self velocity script (x is forward-relative)
  if (m.selfVel) {
    for (const sv of m.selfVel) {
      if (sv.frame === f.moveFrame) {
        if (sv.x !== undefined) {
          const vx = sv.x * f.facing;
          f.vx = sv.mode === 'add' ? f.vx + vx : vx;
        }
        if (sv.y !== undefined) {
          f.vy = sv.mode === 'add' ? f.vy + sv.y : sv.y;
          if (sv.y > 0 && f.onGround) {
            f.onGround = false;
            f.state = 'attack';
          }
        }
      }
    }
  }

  // projectile spawns
  if (m.spawns) {
    for (const ps of m.spawns) {
      if (ps.frame !== f.moveFrame) continue;
      if (ps.capped && f.projCount >= projCap(f)) continue;
      const p: Projectile = {
        id: s.nextEntityId++,
        owner: idx,
        kind: ps.kind,
        x: f.x + f.facing * ps.ox,
        y: f.y + ps.oy,
        vx: ps.vx * f.facing,
        vy: ps.vy,
        gravity: ps.gravity ?? 0,
        life: ps.life,
        hitsLeft: ps.hits,
        box: ps.box,
        damage: ps.damage,
        hitstun: ps.hitstun,
        blockstun: ps.blockstun,
        hitstop: ps.hitstop,
        kbx: ps.kbx,
        kby: ps.kby,
        facing: f.facing,
        capped: !!ps.capped,
        hitTargets: [],
      };
      s.projectiles.push(p);
      if (p.capped) f.projCount++;
      s.events.push({ t: 'projectile', owner: idx });
    }
  }

  // cancels on connect
  if (f.moveConnected > 0 && m.cancelWindow && m.cancelInto) {
    if (f.moveFrame >= m.cancelWindow[0] && f.moveFrame <= m.cancelWindow[1]) {
      const nxt = resolveCancel(s, f, opp, cur, prev, m, idx);
      if (nxt) {
        startMove(s, f, nxt, idx);
        return;
      }
    }
  }

  if (f.moveFrame >= m.duration) {
    f.moveId = null;
    if (!f.onGround) {
      f.state = 'air';
      if (m.landingRecovery) f.landing = m.landingRecovery;
    } else {
      f.state = 'idle';
    }
    // whiff meter
    if (f.moveConnected === 0 && (m.type === 'normal' || m.type === 'special')) {
      f.meter = Math.min(METER_MAX, f.meter + METER_ON_WHIFF);
    }
  }
}

function resolveCancel(
  s: SimState,
  f: FighterState,
  opp: FighterState,
  cur: number,
  prev: number,
  from: Move,
  idx: 0 | 1,
): Move | null {
  const def = getCharacter(f.charId);
  const rd = relDir(cur, f.facing);
  const ctx = ctxOf(f, rd === 2 || rd === 1 || rd === 3);
  const tags = from.cancelInto ?? [];
  const chainList = def.chains[from.id] ?? [];
  for (const ty of ['super', 'special', 'command', 'normal'] as Move['type'][]) {
    for (const m of def.moves) {
      if (m.id === from.id || m.type !== ty) continue;
      const allowed =
        tags.includes(m.id) ||
        tags.includes(m.type) ||
        (m.type === 'normal' && chainList.includes(m.id));
      if (!allowed) continue;
      if (!canAfford(f, m)) continue;
      if (triggerMatches(m, f, cur, prev, ctx)) return m;
    }
  }
  void s;
  void opp;
  void idx;
  return null;
}

function projCap(f: FighterState): number {
  const arche = getCharacter(f.charId).archetype;
  return arche === 'Zoner' ? 3 : 2;
}

function updatePuppet(s: SimState, f: FighterState, opp: FighterState, idx: 0 | 1): void {
  const p = f.puppet;
  if (!p.active) return;
  p.life--;
  if (p.life <= 0) {
    p.active = false;
    return;
  }
  p.facing = opp.x >= p.x ? 1 : -1;
  if (p.state === 'move' && p.moveId) {
    p.moveFrame++;
    if (p.moveFrame === 6 && f.projCount < 4) {
      s.projectiles.push({
        id: s.nextEntityId++,
        owner: idx,
        kind: 'shadebolt',
        x: p.x + p.facing * 14 * UNIT,
        y: p.y + 44 * UNIT,
        vx: p.facing * 5 * UNIT,
        vy: 0,
        gravity: 0,
        life: 80,
        hitsLeft: 1,
        box: { x: -10 * UNIT, y: -8 * UNIT, w: 20 * UNIT, h: 16 * UNIT },
        damage: 38,
        hitstun: 18,
        blockstun: 12,
        hitstop: 8,
        kbx: 3 * UNIT,
        kby: 0,
        facing: p.facing,
        capped: true,
        hitTargets: [],
      });
      f.projCount++;
    }
    if (p.moveFrame > 22) {
      p.state = 'idle';
      p.moveId = null;
    }
  } else {
    // hover behind the owner
    const target = f.x - f.facing * 44 * UNIT;
    p.x += Math.sign(target - p.x) * Math.min(4 * UNIT, Math.abs(target - p.x));
    p.y = FLOOR_Y + 30 * UNIT;
  }
}

function applyPuppet(s: SimState, f: FighterState, m: Move, idx: 0 | 1): void {
  const p = f.puppet;
  if (m.puppet === 'summon') {
    p.active = true;
    p.x = f.x - f.facing * 40 * UNIT;
    p.y = FLOOR_Y;
    p.facing = f.facing;
    p.state = 'idle';
    p.life = 600;
  } else if (m.puppet === 'recall') {
    p.active = false;
  } else if (m.puppet === 'command' && p.active) {
    p.state = 'move';
    p.moveId = m.id;
    p.moveFrame = 0;
  }
  void s;
  void idx;
}

// ---------------------------------------------------------------------------
// physics
// ---------------------------------------------------------------------------

function integratePhysics(s: SimState, f: FighterState): void {
  if (f.hitstop > 0) return;
  const st = getCharacter(f.charId).stats;

  if (f.landing > 0) {
    f.landing--;
    f.vx = decel(f.vx, UNIT);
  }

  if (!f.onGround) {
    f.vy -= st.gravity;
    if (st.fastfall && (curInput(f) & IN.DOWN) !== 0 && f.vy < 0) f.vy -= st.fastfall;
  }

  f.x += f.vx;
  f.y += f.vy;

  if (f.y <= FLOOR_Y) {
    f.y = FLOOR_Y;
    const wasAir = !f.onGround;
    f.onGround = true;
    f.vy = 0;
    if (wasAir) {
      f.jumpsUsed = 0;
      f.airActionsUsed = 0;
      if (f.state === 'airhitstun') {
        f.state = 'knockdown';
        f.knockdown = true;
        f.wakeupTimer = KNOCKDOWN_FRAMES;
        f.vx = Math.round(f.vx / 3);
      } else if (f.state === 'air' || f.state === 'airdash') {
        f.state = 'idle';
        if (f.landing > 0) {
          /* keep landing recovery */
        }
      } else if (f.state === 'attack') {
        if (f.landing > 0) {
          f.state = 'idle';
          f.moveId = null;
        }
      }
    }
  }

  if (f.onGround && (f.state === 'idle' || f.state === 'crouch')) {
    f.vx = decel(f.vx, UNIT);
  }
  if (f.onGround && (f.state === 'knockdown' || f.state === 'hitstun')) {
    f.vx = decel(f.vx, UNIT >> 1);
  }

  f.x = clampWall(s, f.x);
}

function clampWall(s: SimState, x: number): number {
  const lim = s.config.stageHalfWidth - 40 * UNIT;
  return Math.max(-lim, Math.min(lim, x));
}

function pushHalfH(f: FighterState): number {
  if (!f.onGround) return PUSHBOX_AIR_H;
  return f.crouching || f.state === 'crouch' || f.state === 'blockcrouch'
    ? PUSHBOX_CROUCH_H
    : PUSHBOX_STAND_H;
}

function separatePushboxes(s: SimState): void {
  const [a, b] = s.fighters;
  if (a.throwPartner >= 0 || b.throwPartner >= 0) return;
  if (a.state === 'thrown' || b.state === 'thrown') return;
  // only separate when vertically overlapping
  const aTop = a.y + pushHalfH(a);
  const bTop = b.y + pushHalfH(b);
  if (a.y > bTop || b.y > aTop) return;
  const dx = b.x - a.x;
  const minDist = PUSHBOX_HALF_W * 2;
  const dist = Math.abs(dx);
  if (dist >= minDist) return;
  const overlap = minDist - dist;
  const dir = dx >= 0 ? 1 : -1;
  const lim = s.config.stageHalfWidth - 40 * UNIT;
  let aMove = -dir * (overlap >> 1);
  let bMove = dir * (overlap >> 1);
  // if a fighter is airborne, ground fighter yields less
  if (Math.abs(b.x + bMove) > lim) {
    aMove -= dir * (Math.abs(b.x + bMove) - lim);
    bMove = dir * (lim - Math.abs(b.x)) * (b.x >= 0 ? 1 : -1) - b.x + b.x;
  }
  if (Math.abs(a.x + aMove) > lim) {
    bMove += dir * (Math.abs(a.x + aMove) - lim);
  }
  a.x = clampWall(s, a.x + aMove);
  b.x = clampWall(s, b.x + bMove);
}

function stepPhysicsOnly(s: SimState): void {
  for (const f of s.fighters) {
    if (f.hitstop > 0) {
      f.hitstop--;
      continue;
    }
    integratePhysics(s, f);
  }
  stepProjectiles(s);
  updateCamera(s);
}

// ---------------------------------------------------------------------------
// projectiles
// ---------------------------------------------------------------------------

function stepProjectiles(s: SimState): void {
  const keep: Projectile[] = [];
  for (const p of s.projectiles) {
    p.vy -= p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    const off = Math.abs(p.x) > s.config.stageHalfWidth + 60 * UNIT;
    if (p.life <= 0 || p.hitsLeft <= 0 || off || p.y < -40 * UNIT) {
      if (p.capped) s.fighters[p.owner].projCount = Math.max(0, s.fighters[p.owner].projCount - 1);
      continue;
    }
    keep.push(p);
  }
  s.projectiles = keep;

  // projectile clash
  for (let i = 0; i < s.projectiles.length; i++) {
    for (let j = i + 1; j < s.projectiles.length; j++) {
      const p = s.projectiles[i];
      const q = s.projectiles[j];
      if (p.owner === q.owner) continue;
      if (rectsOverlap(projRect(p), projRect(q))) {
        p.hitsLeft--;
        q.hitsLeft--;
        s.hitSparks.push({ x: (p.x + q.x) >> 1, y: (p.y + q.y) >> 1, life: 10, kind: 'clash', big: false });
      }
    }
  }
  s.projectiles = s.projectiles.filter((p) => {
    if (p.hitsLeft > 0) return true;
    if (p.capped) s.fighters[p.owner].projCount = Math.max(0, s.fighters[p.owner].projCount - 1);
    return false;
  });

  if (s.phase !== 'fight') return;
  for (const p of s.projectiles) {
    const d = s.fighters[(1 - p.owner) as 0 | 1];
    if (p.hitTargets.includes(d.playerIndex)) continue;
    if (invulnActive(d, s.frame, false)) continue;
    if (!rectsOverlap(projRect(p), hurtRect(d))) continue;
    const atk = s.fighters[p.owner];
    const blocked = isBlocking(d, false);
    applyContact(s, atk, d, {
      from: 0,
      to: 0,
      box: p.box,
      damage: p.damage,
      hitstun: p.hitstun,
      blockstun: p.blockstun,
      hitstop: p.hitstop,
      kbx: p.kbx,
      kby: p.kby,
      hitId: -p.id,
      projectile: true,
    }, blocked, p.facing, true);
    p.hitTargets.push(d.playerIndex);
    p.hitsLeft--;
  }
  s.projectiles = s.projectiles.filter((p) => {
    if (p.hitsLeft > 0) return true;
    if (p.capped) s.fighters[p.owner].projCount = Math.max(0, s.fighters[p.owner].projCount - 1);
    return false;
  });
}

function projRect(p: Projectile): Rect {
  return toWorld(p.box, p.x, p.y, p.facing);
}

// ---------------------------------------------------------------------------
// melee combat
// ---------------------------------------------------------------------------

function hurtRect(f: FighterState): Rect {
  const m = f.state === 'attack' && f.moveId ? getMove(f.charId, f.moveId) : null;
  let box = HURT_STAND;
  if (m?.hurtbox) box = m.hurtbox;
  else if (!f.onGround) box = HURT_AIR;
  else if (f.crouching || f.state === 'crouch' || f.state === 'blockcrouch') box = HURT_CROUCH;
  return toWorld(box, f.x, f.y, f.facing);
}

function invulnActive(f: FighterState, frame: number, throwOnly: boolean): boolean {
  if (f.invulnUntil > frame) {
    if (f.invulnKind === 'all') return true;
    if (throwOnly && f.invulnKind === 'throw') return true;
    if (!throwOnly && f.invulnKind === 'strike') return true;
    if (!throwOnly && f.invulnKind === 'air' && !f.onGround) return true;
  }
  const m = f.state === 'attack' && f.moveId ? getMove(f.charId, f.moveId) : null;
  if (m?.invuln && f.moveFrame >= m.invuln[0] && f.moveFrame <= m.invuln[1]) {
    const k = m.invulnKind ?? 'all';
    if (k === 'all') return true;
    if (throwOnly && k === 'throw') return true;
    if (!throwOnly && k === 'strike') return true;
  }
  if ((f.state === 'backdash') && f.stateFrame < 6) return true;
  return false;
}

function armorActive(f: FighterState): boolean {
  const m = f.state === 'attack' && f.moveId ? getMove(f.charId, f.moveId) : null;
  return !!(m?.armor && f.moveFrame >= m.armor[0] && f.moveFrame <= m.armor[1] && f.armorHitsLeft > 0);
}

function isBlocking(f: FighterState, lowHit: boolean): boolean {
  if (f.state === 'attack' || f.state === 'hitstun' || f.state === 'airhitstun') return false;
  if (f.state === 'knockdown' || f.state === 'thrown' || f.state === 'intro') return false;
  const rd = relDir(curInput(f), f.facing);
  const holdBack = rd === 4 || rd === 1 || rd === 7;
  if (!holdBack) return false;
  if (f.onGround) {
    const crouch = rd === 1;
    if (lowHit && !crouch) return false; // low must be crouch-blocked
    return true;
  }
  return true; // air block
}

function resolveMelee(s: SimState, ai: 0 | 1, di: 0 | 1): void {
  const atk = s.fighters[ai];
  const def = s.fighters[di];
  if (atk.state !== 'attack' || !atk.moveId || atk.hitstop > 0) return;
  const m = getMove(atk.charId, atk.moveId);
  if (!m) return;

  for (const h of m.hits) {
    if (atk.moveFrame < h.from || atk.moveFrame > h.to) continue;
    if (atk.appliedHits.includes(h.hitId)) continue;

    if (h.grab) {
      if (
        def.onGround &&
        !invulnActive(def, s.frame, true) &&
        def.throwPartner < 0 &&
        def.state !== 'knockdown' &&
        def.state !== 'thrown' &&
        Math.abs(def.x - atk.x) < (h.box.w || THROW_RANGE) &&
        Math.abs(def.y - atk.y) < 70 * UNIT
      ) {
        atk.appliedHits.push(h.hitId);
        doThrow(s, atk, def, h, ai);
        return;
      }
      continue;
    }

    const hb = toWorld(h.box, atk.x, atk.y, atk.facing);
    if (!rectsOverlap(hb, hurtRect(def))) continue;
    if (invulnActive(def, s.frame, false)) {
      atk.appliedHits.push(h.hitId);
      continue;
    }
    atk.appliedHits.push(h.hitId);

    if (armorActive(def)) {
      def.armorHitsLeft--;
      def.health = Math.max(1, def.health - Math.floor(h.damage * 0.4));
      def.hitstop = 6;
      atk.hitstop = 6;
      s.hitSparks.push({ x: hb.x0, y: (hb.y0 + hb.y1) >> 1, life: 10, kind: 'clash', big: false });
      return;
    }

    const blocked = isBlocking(def, !!h.low) && !h.unblockable;
    applyContact(s, atk, def, h, blocked, atk.facing, false);
    return; // one hit per frame
  }
}

interface ContactHit {
  from: number;
  to: number;
  box: { x: number; y: number; w: number; h: number };
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  kbx: number;
  kby: number;
  hitId: number;
  launch?: boolean;
  low?: boolean;
  overhead?: boolean;
  projectile?: boolean;
}

function applyContact(
  s: SimState,
  atk: FighterState,
  def: FighterState,
  h: ContactHit,
  blocked: boolean,
  atkFacing: 1 | -1,
  isProjectile: boolean,
): void {
  const dirAway: 1 | -1 = def.x >= atk.x ? 1 : -1;
  void atkFacing;
  const defWeight = getCharacter(def.charId).stats.weight;

  if (blocked) {
    const isSpecial = isProjectile || h.projectile || h.damage >= 80;
    const chip = isSpecial ? Math.max(1, Math.floor((h.damage * CHIP_PERCENT) / 100)) : 0;
    def.health = Math.max(1, def.health - chip);
    def.blockstun = h.blockstun;
    def.state = !def.onGround ? 'blockair' : relDir(curInput(def), def.facing) === 1 ? 'blockcrouch' : 'blockstand';
    def.vx = dirAway * Math.floor((Math.abs(h.kbx) * 45) / 100 + 1 * UNIT);
    atk.vx = -dirAway * (1 * UNIT);
    atk.hitstop = Math.min(h.hitstop, 8);
    def.hitstop = Math.min(h.hitstop, 8);
    def.blockFlash = 6;
    atk.meter = clampMeter(atk.meter + METER_ON_BLOCK);
    def.meter = clampMeter(def.meter + METER_ON_BLOCK);
    atk.comboHitsDealt = 0;
    def.comboCount = 0;
    if (atk.moveConnected === 0) atk.moveConnected = 2;
    s.hitSparks.push({ x: (def.x), y: def.y + 50 * UNIT, life: 10, kind: 'block', big: false });
    s.events.push({ t: 'block', defender: def.playerIndex });
    return;
  }

  // hit
  const wasInStun = def.state === 'hitstun' || def.state === 'airhitstun' || def.state === 'blockstun';
  atk.comboHitsDealt = wasInStun ? atk.comboHitsDealt + 1 : 1;
  def.comboCount = atk.comboHitsDealt;

  let scale = 100;
  if (atk.comboHitsDealt >= SCALING_START_HIT) {
    scale = Math.max(SCALING_MIN, 100 - (atk.comboHitsDealt - SCALING_START_HIT + 1) * SCALING_STEP);
  }
  const counter = !isProjectile && def.state === 'attack' && def.moveFrame <= startupOf(def);
  let dmg = Math.floor((h.damage * scale) / 100);
  if (counter) dmg = Math.floor((dmg * 120) / 100);
  dmg = Math.max(1, dmg);
  def.health = Math.max(0, def.health - dmg);

  const stun = h.hitstun + (counter ? 6 : 0);
  const airborneHit = h.launch || !def.onGround || h.kby > 0;
  const kbx = Math.floor((Math.abs(h.kbx) * 100) / defWeight) * dirAway;
  if (airborneHit) {
    def.onGround = false;
    def.state = 'airhitstun';
    def.vy = h.kby > 0 ? Math.floor((h.kby * 100) / defWeight) : h.launch ? LAUNCH_VY : 3 * UNIT;
    def.vx = kbx === 0 ? dirAway * 2 * UNIT : kbx;
  } else {
    def.state = 'hitstun';
    def.vx = kbx;
    def.vy = 0;
  }
  def.hitstun = stun;
  def.blockstun = 0;
  def.moveId = null;
  def.moveConnected = 0;
  def.hitFlash = 6;
  def.dizzy = Math.min(100, def.dizzy + (counter ? 22 : 12));

  atk.hitstop = h.hitstop;
  def.hitstop = h.hitstop;
  atk.lastHitFrame = s.frame;
  if (atk.moveConnected !== 1) atk.moveConnected = 1;

  atk.meter = clampMeter(atk.meter + METER_ON_HIT_DEALT);
  def.meter = clampMeter(def.meter + METER_ON_HIT_TAKEN);

  s.screenShake = Math.max(s.screenShake, counter ? 9 : h.damage >= 70 ? 7 : 4);
  s.hitSparks.push({
    x: def.x + dirAway * -14 * UNIT,
    y: def.y + 52 * UNIT,
    life: 12,
    kind: counter ? 'counter' : 'hit',
    big: h.damage >= 70,
  });
  s.events.push({
    t: 'hit',
    attacker: atk.playerIndex,
    damage: dmg,
    combo: atk.comboHitsDealt,
    counter,
    charId: atk.charId,
  });
}

function startupOf(f: FighterState): number {
  const m = f.moveId ? getMove(f.charId, f.moveId) : null;
  return m ? m.startup : 0;
}

function doThrow(s: SimState, atk: FighterState, def: FighterState, h: HitDef, ai: 0 | 1): void {
  const dmg = Math.max(1, Math.floor(h.damage));
  def.health = Math.max(0, def.health - dmg);
  def.state = 'thrown';
  def.throwPartner = ai;
  atk.throwPartner = def.playerIndex;
  def.hitstun = 30;
  def.vx = 0;
  def.vy = 0;
  def.moveId = null;
  atk.hitstop = 8;
  def.hitstop = 8;
  atk.comboHitsDealt = 1;
  def.comboCount = 1;
  atk.meter = clampMeter(atk.meter + METER_ON_HIT_DEALT);
  s.screenShake = Math.max(s.screenShake, 6);
  s.events.push({ t: 'throw', attacker: ai });
  atk.throwReleaseTimer = 14;
  atk.throwKbx = Math.abs(h.kbx);
  atk.throwKby = h.kby;
}

/** Resolve pending throw releases (state lives in SimState so replays stay deterministic). */
function processThrowReleases(s: SimState): void {
  for (const atk of s.fighters) {
    if (atk.throwReleaseTimer <= 0) continue;
    atk.throwReleaseTimer--;
    // keep victim glued to the thrower during the hold
    if (atk.throwPartner >= 0) {
      const v = s.fighters[atk.throwPartner as 0 | 1];
      v.x = clampWall(s, atk.x + atk.facing * THROW_HOLD_DIST);
      v.facing = (-atk.facing) as 1 | -1;
      v.vx = 0;
      v.vy = 0;
    }
    if (atk.throwReleaseTimer <= 0) {
      const v = atk.throwPartner >= 0 ? s.fighters[atk.throwPartner as 0 | 1] : null;
      if (v) {
        const dirAway = (v.x >= atk.x ? 1 : -1) as 1 | -1;
        v.state = 'airhitstun';
        v.onGround = false;
        v.throwPartner = -1;
        v.vx = dirAway * atk.throwKbx;
        v.vy = atk.throwKby;
        v.hitstun = 18;
      }
      atk.throwPartner = -1;
      atk.throwReleaseTimer = 0;
      if (atk.state === 'attack') {
        atk.state = 'idle';
        atk.moveId = null;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// round / match flow
// ---------------------------------------------------------------------------

function checkRoundOver(s: SimState): void {
  processThrowReleases(s);
  const [a, b] = s.fighters;
  if (a.health <= 0 || b.health <= 0) {
    const aDead = a.health <= 0;
    const bDead = b.health <= 0;
    s.roundWinner = aDead && bDead ? -1 : aDead ? 1 : 0;
    s.phase = 'roundend';
    s.phaseFrame = 0;
    s.koSlowmo = KO_SLOWMO_FRAMES;
    s.screenShake = 14;
    const loser = aDead ? 0 : 1;
    s.events.push({ t: 'ko', loser: loser as 0 | 1 });
    for (const f of s.fighters) {
      if (f.health <= 0) {
        f.state = 'airhitstun';
        f.onGround = false;
        f.vy = 5 * UNIT;
        f.vx = (f.x >= 0 ? 1 : -1) * 3 * UNIT;
        f.hitstun = 120;
      }
    }
    return;
  }
  if (s.roundTimer > 0) {
    s.roundTimer--;
    if (s.roundTimer <= 0) {
      s.roundWinner = a.health === b.health ? -1 : a.health > b.health ? 0 : 1;
      s.phase = 'roundend';
      s.phaseFrame = 0;
      s.events.push({ t: 'roundend', winner: s.roundWinner });
    }
  }
}

function endRoundResolve(s: SimState): void {
  if (!s.config.training && s.roundWinner >= 0) {
    s.wins[s.roundWinner as 0 | 1]++;
  }
  const matchOver =
    !s.config.training &&
    (s.wins[0] >= s.config.roundsToWin || s.wins[1] >= s.config.roundsToWin);
  if (matchOver) {
    s.phase = 'matchend';
    s.phaseFrame = 0;
    const w = (s.wins[0] > s.wins[1] ? 0 : 1) as 0 | 1;
    s.events.push({ t: 'matchend', winner: w });
    for (const f of s.fighters) f.state = f.playerIndex === w ? 'win' : 'knockdown';
    return;
  }
  // next round
  const p1 = s.fighters[0].charId;
  const p2 = s.fighters[1].charId;
  const startX = s.config.startX;
  s.fighters = [makeFighter(p1, 0, -startX, 1), makeFighter(p2, 1, startX, -1)];
  s.projectiles = [];
  s.nextEntityId = 1;
  s.roundTimer = s.config.roundTime;
  s.roundWinner = -1;
  s.roundNumber++;
  s.phase = 'intro';
  s.phaseFrame = 0;
  s.cameraX = 0;
  s.hitSparks = [];
  s.screenShake = 0;
}

function updateCamera(s: SimState): void {
  const [a, b] = s.fighters;
  const mid = (a.x + b.x) >> 1;
  const lim = s.config.stageHalfWidth - (VIEW_W / 2) * UNIT;
  const target = Math.max(-lim, Math.min(lim, mid));
  s.cameraX += (target - s.cameraX) >> 3;
}

// ---------------------------------------------------------------------------
// meter helpers
// ---------------------------------------------------------------------------

function clampMeter(v: number): number {
  return Math.max(0, Math.min(METER_MAX, v));
}
function clampMeters(s: SimState): void {
  for (const f of s.fighters) f.meter = clampMeter(f.meter);
}

export { LAUNCH_VY };
export type { CharStats };

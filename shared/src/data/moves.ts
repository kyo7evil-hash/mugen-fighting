import { UNIT } from '../sim/constants.js';
import type {
  Box,
  ChargeKind,
  HitDef,
  MotionName,
  Move,
  MoveContext,
  ProjectileSpawn,
  Trigger,
} from '../sim/types.js';

/** Box from pixel values (relative to foot origin, +y up). */
export function pbox(x: number, y: number, w: number, h: number): Box {
  return { x: x * UNIT, y: y * UNIT, w: w * UNIT, h: h * UNIT };
}

let HIT_ID = 1;
export function nextHitId(): number {
  return HIT_ID++;
}

interface HitOpts {
  from: number;
  to: number;
  box: Box;
  damage: number;
  hitstun?: number;
  blockstun?: number;
  hitstop?: number;
  kbx?: number; // pixels/frame
  kby?: number;
  launch?: boolean;
  low?: boolean;
  overhead?: boolean;
  grab?: boolean;
  airGrab?: boolean;
  projectile?: boolean;
  blockPush?: number;
  hitId?: number;
}

export function hit(o: HitOpts): HitDef {
  return {
    from: o.from,
    to: o.to,
    box: o.box,
    damage: o.damage,
    hitstun: o.hitstun ?? 16,
    blockstun: o.blockstun ?? 11,
    hitstop: o.hitstop ?? 9,
    kbx: (o.kbx ?? 3) * UNIT,
    kby: (o.kby ?? 0) * UNIT,
    launch: o.launch,
    low: o.low,
    overhead: o.overhead,
    grab: o.grab,
    airGrab: o.airGrab,
    projectile: o.projectile,
    blockPush: (o.blockPush ?? 0) * UNIT,
    hitId: o.hitId ?? nextHitId(),
  };
}

interface ProjOpts {
  frame: number;
  kind: string;
  ox: number;
  oy: number;
  vx: number; // px/frame
  vy?: number;
  life: number;
  hits?: number;
  box: Box;
  damage: number;
  hitstun?: number;
  blockstun?: number;
  hitstop?: number;
  kbx?: number;
  kby?: number;
  gravity?: number;
  capped?: boolean;
}

export function proj(o: ProjOpts): ProjectileSpawn {
  return {
    frame: o.frame,
    kind: o.kind,
    ox: o.ox * UNIT,
    oy: o.oy * UNIT,
    vx: o.vx * UNIT,
    vy: (o.vy ?? 0) * UNIT,
    life: o.life,
    hits: o.hits ?? 1,
    box: o.box,
    damage: o.damage,
    hitstun: o.hitstun ?? 18,
    blockstun: o.blockstun ?? 12,
    hitstop: o.hitstop ?? 8,
    kbx: (o.kbx ?? 3) * UNIT,
    kby: (o.kby ?? 0) * UNIT,
    gravity: (o.gravity ?? 0) * UNIT,
    capped: o.capped ?? true,
  };
}

export function trig(t: Trigger): Trigger {
  return t;
}

interface MoveOpts extends Partial<Move> {
  id: string;
  name: string;
  type: Move['type'];
  trigger: Trigger;
  startup: number;
  active: number;
  recovery: number;
  hits?: HitDef[];
}

export function move(o: MoveOpts): Move {
  const duration = o.duration ?? o.startup + o.active + o.recovery;
  return {
    ...o,
    hits: o.hits ?? [],
    duration,
  };
}

interface SpecOpts extends Partial<Move> {
  motion?: MotionName;
  charge?: ChargeKind;
  cmd?: 'forward' | 'back' | 'down' | 'up';
  button: 'LP' | 'HP' | 'LK' | 'HK' | 'S1' | 'S2';
  ctx?: MoveContext;
}

/** Special-move builder. Provide one of motion / charge / cmd (else a bare button special). */
export function special(
  id: string,
  name: string,
  o: SpecOpts,
  frames: [number, number, number],
  h: HitDef | HitDef[] = [],
  extra: Partial<Move> = {},
): Move {
  const ctx = o.ctx ?? 'stand';
  let trigger: Trigger;
  if (o.motion) trigger = { kind: 'motion', motion: o.motion, button: o.button, ctx };
  else if (o.charge) trigger = { kind: 'charge', charge: o.charge, button: o.button, ctx };
  else if (o.cmd) trigger = { kind: 'command', button: o.button, dir: o.cmd, ctx };
  else trigger = { kind: 'normal', button: o.button, ctx };
  const { motion, charge, cmd, button, ctx: _c, ...rest } = o;
  void motion;
  void charge;
  void cmd;
  void button;
  void _c;
  return move({
    ...rest,
    ...extra,
    id,
    name,
    type: 'special',
    trigger,
    startup: frames[0],
    active: frames[1],
    recovery: frames[2],
    hits: Array.isArray(h) ? h : [h],
  });
}

/** Super-move builder. Defaults: type 'super', 1000 meter, motion trigger. */
export function superMove(
  id: string,
  name: string,
  o: SpecOpts,
  frames: [number, number, number],
  h: HitDef | HitDef[] = [],
  extra: Partial<Move> = {},
): Move {
  const m = special(id, name, o, frames, h, extra);
  m.type = 'super';
  m.meterCost = o.meterCost ?? extra.meterCost ?? 1000;
  if (m.invuln === undefined && !m.armor) {
    m.invuln = [1, frames[0] + 2];
    m.invulnKind = 'strike';
  }
  return m;
}

/** Quick normal attack builder. ctx: stand|crouch|air. */
export function normal(
  id: string,
  name: string,
  button: 'LP' | 'HP' | 'LK' | 'HK',
  ctx: MoveContext,
  frames: [number, number, number], // startup, active, recovery
  h: HitDef | HitDef[],
  extra: Partial<Move> = {},
): Move {
  const hits = Array.isArray(h) ? h : [h];
  return move({
    id,
    name,
    type: 'normal',
    trigger: { kind: 'normal', button, ctx },
    startup: frames[0],
    active: frames[1],
    recovery: frames[2],
    airOk: ctx === 'air',
    hits,
    ...extra,
  });
}

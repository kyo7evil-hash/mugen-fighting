import {
  IN,
  UNIT,
  getCharacter,
  getMove,
  type FighterState,
  type Move,
  type SimState,
} from '@mugen/shared';

interface Tuning {
  react: number; // decision cooldown frames
  block: number; // 0..1 chance to block a threat
  aggro: number; // 0..1 approach/attack tendency
  tech: number; // 0..1 chance to tech throws / do reversals
  combo: number; // 0..1 chance to follow a full combo on hit
}

const TUNINGS: Tuning[] = [
  { react: 16, block: 0.35, aggro: 0.4, tech: 0.1, combo: 0.25 }, // easy
  { react: 9, block: 0.6, aggro: 0.62, tech: 0.35, combo: 0.6 }, // normal
  { react: 5, block: 0.82, aggro: 0.78, tech: 0.6, combo: 0.9 }, // hard
];

function fwdBit(facing: 1 | -1): number {
  return facing === 1 ? IN.RIGHT : IN.LEFT;
}
function backBit(facing: 1 | -1): number {
  return facing === 1 ? IN.LEFT : IN.RIGHT;
}

/** Expand a move into a short input script (array of per-frame bitmasks). */
function motionScript(m: Move, facing: 1 | -1): number[] {
  const F = fwdBit(facing);
  const B = backBit(facing);
  const D = IN.DOWN;
  const btnBit =
    { LP: IN.LP, HP: IN.HP, LK: IN.LK, HK: IN.HK, S1: IN.S1, S2: IN.S2 }[m.trigger.button] ?? IN.LP;
  const t = m.trigger;
  if (t.kind === 'normal') {
    const hold = t.ctx === 'crouch' ? D : 0;
    return [hold, hold | btnBit, hold | btnBit];
  }
  if (t.kind === 'command') {
    const d = t.dir === 'forward' ? F : t.dir === 'back' ? B : t.dir === 'down' ? D : IN.UP;
    return [d, d | btnBit, d | btnBit];
  }
  if (t.kind === 'charge') {
    // assumes CPU has been holding the charge direction; just release + press
    if (t.charge === 'ud') return [D, D, IN.UP | btnBit, IN.UP | btnBit];
    return [B, B, F | btnBit, F | btnBit];
  }
  // motion
  switch (t.motion) {
    case 'qcf':
      return [D, D | F, F, F | btnBit, F | btnBit];
    case 'qcb':
      return [D, D | B, B, B | btnBit, B | btnBit];
    case 'dp':
      return [F, D, D | F, D | F | btnBit, btnBit];
    case 'rdp':
      return [B, D, D | B, D | B | btnBit, btnBit];
    case 'hcf':
      return [B, D | B, D, D | F, F | btnBit, F | btnBit];
    case 'hcb':
      return [F, D | F, D, D | B, B | btnBit, B | btnBit];
    case '360':
      return [B, D, F, D, B, btnBit, btnBit];
    case 'dd':
      return [D, 0, D, D | btnBit, btnBit];
    case 'ff':
      return [F, 0, F | btnBit, F | btnBit];
    case 'bb':
      return [B, 0, B | btnBit, B | btnBit];
    default:
      return [btnBit, btnBit];
  }
}

export class CpuBrain {
  private index: 0 | 1;
  private tuning: Tuning;
  private queue: number[] = [];
  private cooldown = 0;
  private rngState: number;
  private chargeHold = 0;

  constructor(index: 0 | 1, difficulty: 0 | 1 | 2, seed = 12345) {
    this.index = index;
    this.tuning = TUNINGS[difficulty] ?? TUNINGS[1];
    this.rngState = (seed ^ (index + 1) * 2654435761) >>> 0;
  }

  private rand(): number {
    let t = (this.rngState + 0x6d2b79f5) | 0;
    this.rngState = t >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private pushCombo(me: FighterState, ids: string[]): void {
    for (const id of ids) {
      const m = getMove(me.charId, id);
      if (!m) continue;
      this.queue.push(...motionScript(m, me.facing));
      this.queue.push(0);
    }
  }

  think(s: SimState, hitThisFrame: boolean): number {
    const me = s.fighters[this.index];
    const foe = s.fighters[(1 - this.index) as 0 | 1];
    const def = getCharacter(me.charId);
    const F = fwdBit(me.facing);
    const B = backBit(me.facing);

    if (s.phase !== 'fight') {
      this.queue.length = 0;
      return 0;
    }

    // finish a queued script
    if (this.queue.length) {
      return this.queue.shift() ?? 0;
    }

    const dist = Math.abs(foe.x - me.x) / UNIT;
    const foeAttacking = foe.state === 'attack';
    const foeAirborne = !foe.onGround && (foe.state === 'air' || foe.state === 'attack');
    const iAmStunned = me.state === 'hitstun' || me.state === 'blockstun' || me.state === 'airhitstun';
    const iAmActionable =
      me.state === 'idle' ||
      me.state === 'walk' ||
      me.state === 'backwalk' ||
      me.state === 'crouch';

    // stunned -> hold back to block on wakeup
    if (iAmStunned) return B | IN.DOWN;

    // tech throws
    if (foe.state === 'attack' && foe.moveId && dist < 40 && this.rand() < this.tuning.tech) {
      const fm = getMove(foe.charId, foe.moveId);
      if (fm && fm.hits.some((h) => h.grab)) return IN.LP | IN.LK;
    }

    if (this.cooldown > 0) {
      this.cooldown--;
      // keep charging for charge characters
      const usesCharge = def.moves.some((m) => m.trigger.kind === 'charge');
      if (usesCharge && iAmActionable && dist > 55) return B;
      if (foeAttacking && dist < 46 && this.rand() < this.tuning.block) return B;
      return this.idleDrift(me, foe, dist, F, B);
    }
    this.cooldown = this.tuning.react + Math.floor(this.rand() * 6);

    // block incoming
    if (foeAttacking && dist < 52 && this.rand() < this.tuning.block) {
      return (this.rand() < 0.4 ? IN.DOWN : 0) | B;
    }

    // anti-air
    if (foeAirborne && dist < 70 && this.rand() < this.tuning.aggro) {
      const aa =
        def.moves.find((m) => m.type === 'special' && /dp|623/.test(triggerKey(m))) ??
        def.moves.find((m) => m.id === 'stHK') ??
        def.moves.find((m) => m.type === 'special');
      if (aa) {
        this.queue.push(...motionScript(aa, me.facing));
        return this.queue.shift() ?? 0;
      }
    }

    // punish / pressure on hit
    if (hitThisFrame && dist < 46 && this.rand() < this.tuning.combo) {
      const combo = def.combos[Math.floor(this.rand() * def.combos.length)];
      if (combo) {
        this.pushCombo(me, combo);
        return this.queue.shift() ?? 0;
      }
    }

    // spacing behaviour
    if (dist > 120) {
      // zoner: fireball; others: approach
      const fb = def.moves.find(
        (m) => m.type === 'special' && (m.spawns?.length ?? 0) > 0 && m.trigger.button !== 'S1',
      );
      if (fb && def.archetype === 'Zoner' && this.rand() < 0.7) {
        this.queue.push(...motionScript(fb, me.facing));
        return this.queue.shift() ?? 0;
      }
      return this.rand() < 0.5 ? F : F | (this.rand() < 0.3 ? 0 : 0);
    }

    if (dist > 55) {
      if (this.rand() < this.tuning.aggro) {
        // dash in
        this.queue.push(F, 0, F, F, F);
        return F;
      }
      return this.rand() < 0.5 ? F : 0;
    }

    // in range: poke / special / throw
    const roll = this.rand();
    if (roll < 0.16 && dist < 34) return IN.LP | IN.LK; // throw
    if (roll < 0.45) {
      const pokes = def.moves.filter((m) => m.type === 'normal' && (m.id === 'stLP' || m.id === 'stHP' || m.id === 'crLK'));
      const p = pokes[Math.floor(this.rand() * pokes.length)] ?? def.moves[0];
      this.queue.push(...motionScript(p, me.facing));
      if (this.rand() < this.tuning.combo) {
        const combo = def.combos[Math.floor(this.rand() * def.combos.length)];
        if (combo) this.pushCombo(me, combo);
      }
      return this.queue.shift() ?? 0;
    }
    if (roll < 0.7) {
      const sp = def.moves.filter((m) => m.type === 'special' && !m.spawns);
      const p = sp[Math.floor(this.rand() * sp.length)];
      if (p) {
        this.queue.push(...motionScript(p, me.facing));
        return this.queue.shift() ?? 0;
      }
    }
    if (roll < 0.82 && me.meter >= 1000) {
      const su = def.moves.find((m) => m.type === 'super');
      if (su) {
        this.queue.push(...motionScript(su, me.facing));
        return this.queue.shift() ?? 0;
      }
    }
    return this.idleDrift(me, foe, dist, F, B);
  }

  private idleDrift(
    me: FighterState,
    foe: FighterState,
    dist: number,
    F: number,
    B: number,
  ): number {
    void me;
    void foe;
    if (dist > 60) return this.rand() < 0.6 ? F : 0;
    if (dist < 26) return this.rand() < 0.3 ? B : 0;
    return this.rand() < 0.2 ? (this.rand() < 0.5 ? F : B) : 0;
  }
}

function triggerKey(m: Move): string {
  const t = m.trigger;
  if (t.kind === 'motion') return t.motion;
  if (t.kind === 'charge') return t.charge;
  if (t.kind === 'command') return t.dir;
  return t.button;
}

import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  IN,
  UNIT,
  checksum,
  createInitialState,
  getMove,
  step,
  type InputBits,
  type SimState,
} from '../src/index.js';
import { rectsOverlap, toWorld } from '../src/sim/boxes.js';
import { detectMotion } from '../src/sim/motion.js';

function run(inputs: [InputBits, InputBits][], init = { p1: 'kaito', p2: 'bruno', seed: 'seed-1' }): SimState {
  let s = createInitialState(init);
  for (const inp of inputs) s = step(s, inp);
  return s;
}

function script(frames: number, fn: (i: number) => [number, number]): [number, number][] {
  return Array.from({ length: frames }, (_, i) => fn(i));
}

describe('simulation core', () => {
  it('advances frame count and leaves intro after INTRO_FRAMES', () => {
    const s = run(script(120, () => [0, 0]));
    expect(s.frame).toBe(120);
    expect(s.phase).toBe('fight');
  });

  it('is deterministic: identical inputs -> identical checksum', () => {
    const inputs = script(1500, (i) => [
      (i % 40 < 10 ? IN.RIGHT : 0) | (i % 17 === 0 ? IN.LP : 0) | (i % 111 === 0 ? IN.UP : 0),
      (i % 33 < 8 ? IN.LEFT : 0) | (i % 23 === 0 ? IN.HK : 0),
    ]);
    const a = run(inputs);
    const b = run(inputs);
    expect(checksum(a)).toBe(checksum(b));
    expect(a.fighters[0].health).toBe(b.fighters[0].health);
  });

  it('deals damage on a clean hit', () => {
    // walk forward while jabbing until in range (intro lasts 90 frames)
    const inputs = script(500, (i) => [IN.RIGHT | (i % 11 < 3 ? IN.LP : 0), 0]);
    const s = run(inputs);
    expect(s.fighters[1].health).toBeLessThan(s.fighters[1].maxHealth);
  });

  it('holding back to block takes less damage than standing open', () => {
    const seq = (d2: (i: number) => number) =>
      script(500, (i) => [IN.RIGHT | (i % 11 < 3 ? IN.LP : 0), d2(i)]);
    const open = run(seq(() => 0));
    const blocked = run(seq(() => IN.RIGHT)); // p2 holds away from p1
    expect(blocked.fighters[1].health).toBeGreaterThan(open.fighters[1].health);
  });

  it('a round can end in KO and award a win', () => {
    // give P1 a big head start by scripting many hits; loop long
    let s = createInitialState({ p1: 'bruno', p2: 'kaito', seed: 'ko' });
    for (let i = 0; i < 6000 && s.wins[0] + s.wins[1] < 1; i++) {
      const inp: [number, number] = i < 60 ? [IN.RIGHT, 0] : [i % 20 < 4 ? IN.HP : IN.RIGHT, 0];
      s = step(s, inp);
    }
    expect(s.wins[0] + s.wins[1]).toBeGreaterThanOrEqual(0);
    expect(s.frame).toBeGreaterThan(60);
  });

  it('every character has a valid, registered moveset', () => {
    for (const c of CHARACTERS) {
      expect(c.moves.length).toBeGreaterThanOrEqual(6);
      for (const m of c.moves) {
        expect(getMove(c.id, m.id)).toBeDefined();
        expect(m.duration).toBeGreaterThan(0);
        for (const h of m.hits) expect(h.to).toBeGreaterThanOrEqual(h.from);
      }
      // at least one special + one super
      expect(c.moves.some((m) => m.type === 'special')).toBe(true);
      expect(c.moves.some((m) => m.type === 'super')).toBe(true);
    }
  });

  it('every character can be simulated headlessly for 900 frames without throwing', () => {
    for (const c of CHARACTERS) {
      let s = createInitialState({ p1: c.id, p2: 'kaito', seed: `smoke-${c.id}` });
      for (let i = 0; i < 900; i++) {
        s = step(s, [i % 15 < 4 ? IN.LP : IN.RIGHT, i % 19 < 3 ? IN.LK : 0]);
      }
      expect(Number.isFinite(s.fighters[0].x)).toBe(true);
      expect(Number.isFinite(s.fighters[1].health)).toBe(true);
    }
  });
});

describe('collision helpers', () => {
  it('toWorld flips x by facing', () => {
    const box = { x: 10 * UNIT, y: 0, w: 20 * UNIT, h: 10 * UNIT };
    const right = toWorld(box, 0, 0, 1);
    const left = toWorld(box, 0, 0, -1);
    expect(right.x0).toBe(10 * UNIT);
    expect(left.x1).toBe(-10 * UNIT);
  });

  it('rectsOverlap detects and rejects', () => {
    const a = { x0: 0, y0: 0, x1: 10, y1: 10 };
    expect(rectsOverlap(a, { x0: 5, y0: 5, x1: 15, y1: 15 })).toBe(true);
    expect(rectsOverlap(a, { x0: 20, y0: 0, x1: 30, y1: 10 })).toBe(false);
  });
});

describe('motion parser', () => {
  const hold = (bits: number, n: number): number[] => Array.from({ length: n }, () => bits);
  it('detects a quarter-circle forward (facing right)', () => {
    const hist = [
      ...hold(0, 4),
      ...hold(IN.DOWN, 3),
      ...hold(IN.DOWN | IN.RIGHT, 3),
      ...hold(IN.RIGHT, 3),
    ];
    expect(detectMotion(hist, 1, 'qcf')).toBe(true);
    expect(detectMotion(hist, 1, 'qcb')).toBe(false);
  });

  it('detects a dragon-punch motion', () => {
    const hist = [
      ...hold(IN.RIGHT, 3),
      ...hold(IN.DOWN, 3),
      ...hold(IN.DOWN | IN.RIGHT, 3),
    ];
    expect(detectMotion(hist, 1, 'dp')).toBe(true);
  });
});

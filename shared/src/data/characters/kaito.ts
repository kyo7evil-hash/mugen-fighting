import { hit, normal, pbox, proj, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 01 — Kaito "the Ronin": balanced shoto all-rounder. Fireball / uppercut / spin. */
export const kaito: CharacterDef = {
  id: 'kaito',
  name: 'Kaito',
  archetype: 'All-Rounder',
  bio: 'A wandering swordless ronin who fights with disciplined ki. Every tool he needs, none he does not.',
  quote: 'Balance is a blade with two edges.',
  stage: 'dojo',
  fullyTuned: true,
  stats: stats({ maxHealth: 1000 }),
  palette: {
    skin: '#e8b088',
    hair: '#2b2b33',
    primary: '#d8d0c0',
    secondary: '#b03636',
    accent: '#3a6ea5',
    outline: '#1c1c22',
  },
  build: { height: 46, headR: 5, shoulder: 9, hip: 7, limb: 4, bulk: 1, style: 'gi' },
  moves: [
    normal('stLP', 'Jab', 'LP', 'stand', [4, 3, 7], hit({ from: 4, to: 6, box: pbox(18, 42, 34, 16), damage: 30, hitstun: 14, blockstun: 10, kbx: 2 }), {
      cancelWindow: [4, 12],
      cancelInto: ['special', 'super', 'stHP', 'crLK'],
    }),
    normal('stHP', 'Straight', 'HP', 'stand', [7, 4, 14], hit({ from: 7, to: 10, box: pbox(20, 54, 46, 20), damage: 60, hitstun: 20, blockstun: 13, kbx: 4 }), {
      cancelWindow: [7, 18],
      cancelInto: ['special', 'super'],
      starter: true,
    }),
    normal('crLK', 'Low Kick', 'LK', 'crouch', [5, 3, 9], hit({ from: 5, to: 7, box: pbox(16, 12, 44, 16), damage: 26, hitstun: 14, blockstun: 11, kbx: 2, low: true }), {
      cancelWindow: [5, 12],
      cancelInto: ['special', 'super', 'crLK'],
    }),
    normal('stHK', 'Roundhouse', 'HK', 'stand', [11, 4, 20], hit({ from: 11, to: 14, box: pbox(18, 40, 52, 40), damage: 80, hitstun: 24, blockstun: 15, kbx: 5, kby: 6, launch: true }), {
      starter: true,
    }),
    normal('jHK', 'Jump Kick', 'HK', 'air', [8, 6, 8], hit({ from: 8, to: 13, box: pbox(10, 6, 40, 34), damage: 70, hitstun: 18, blockstun: 13, kbx: 3, kby: -2 }), {
      landingRecovery: 4,
    }),
    special('hadou', 'Hadou Bolt', { motion: 'qcf', button: 'LP' }, [13, 2, 26], [], {
      spawns: [proj({ frame: 13, kind: 'kiball', ox: 26, oy: 46, vx: 5.4, life: 90, box: pbox(-12, -10, 24, 22), damage: 50, hitstun: 20, blockstun: 13, kbx: 4 })],
    }),
    special('shoryu', 'Rising Fang', { motion: 'dp', button: 'HP' }, [4, 14, 22], [
      hit({ from: 4, to: 6, box: pbox(10, 40, 34, 40), damage: 60, hitstun: 22, blockstun: 12, kbx: 2, kby: 9, launch: true, hitId: 5001 }),
      hit({ from: 7, to: 16, box: pbox(4, 60, 30, 60), damage: 40, hitstun: 20, blockstun: 10, kbx: 2, kby: 5, launch: true, hitId: 5002 }),
    ], {
      invuln: [1, 6],
      invulnKind: 'strike',
      selfVel: [
        { frame: 1, x: px(3), y: px(10) },
        { frame: 10, y: px(-2), mode: 'add' },
      ],
      landingRecovery: 18,
    }),
    special('tatsu', 'Cyclone Heel', { motion: 'qcb', button: 'LK' }, [10, 18, 16], [
      hit({ from: 10, to: 12, box: pbox(14, 30, 44, 34), damage: 26, hitstun: 16, blockstun: 10, kbx: 2, hitId: 5010 }),
      hit({ from: 15, to: 17, box: pbox(14, 30, 44, 34), damage: 24, hitstun: 16, blockstun: 10, kbx: 2, hitId: 5011 }),
      hit({ from: 20, to: 24, box: pbox(14, 26, 46, 34), damage: 30, hitstun: 22, blockstun: 12, kbx: 6, kby: 4, launch: true, hitId: 5012 }),
    ], {
      selfVel: [
        { frame: 1, x: px(5) },
        { frame: 14, x: px(4) },
        { frame: 25, x: 0 },
      ],
      airOk: true,
    }),
    superMove('shinku', 'Shinku Hadou', { motion: 'qcf', button: 'S1' }, [8, 40, 30], [
      hit({ from: 8, to: 9, box: pbox(20, 40, 40, 40), damage: 40, hitstun: 30, blockstun: 18, kbx: 1, hitId: 5100 }),
    ], {
      spawns: [
        proj({ frame: 9, kind: 'kibeam', ox: 30, oy: 44, vx: 7, life: 70, hits: 5, box: pbox(-30, -22, 60, 44), damage: 40, hitstun: 22, blockstun: 12, kbx: 2, capped: false }),
      ],
    }),
  ],
  chains: {
    stLP: ['stHP', 'crLK', 'stHK'],
    crLK: ['crLK', 'stHP'],
    stHP: ['stHK'],
  },
  combos: [
    ['stLP', 'stHP', 'shoryu'],
    ['crLK', 'crLK', 'hadou'],
    ['stHP', 'tatsu'],
    ['stHK', 'shinku'],
  ],
  voice: { hit: 220, ko: 140, special: 330 },
};

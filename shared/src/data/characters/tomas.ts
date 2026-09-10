import { hit, move, normal, pbox, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 07 — Tomas "Two-Forms": stance switcher. Tap S1 to flip between Flow (A) and Stone (B). */
export const tomas: CharacterDef = {
  id: 'tomas',
  name: 'Tomas',
  archetype: 'Stance Switcher',
  bio: 'Studied two opposing schools and refused to pick one. Flows like water, then sets like stone.',
  quote: 'Which of me were you training against?',
  stage: 'courtyard',
  fullyTuned: false,
  stats: stats({ maxHealth: 980, walkFwd: px(2.4), weight: 104 }),
  palette: {
    skin: '#dca078',
    hair: '#20202a',
    primary: '#2f6f6a',
    secondary: '#b8863b',
    accent: '#e8e2c0',
    outline: '#131a19',
  },
  build: { height: 46, headR: 5, shoulder: 9, hip: 7, limb: 4, bulk: 1, style: 'robe' },
  moves: [
    move({
      id: 'stance',
      name: 'Change Form',
      type: 'command',
      trigger: { kind: 'normal', button: 'S1', ctx: 'stand' },
      startup: 0,
      active: 0,
      recovery: 14,
      stanceToggle: true,
      hits: [],
    }),
    normal('stLP', 'Jab', 'LP', 'stand', [4, 3, 7], hit({ from: 4, to: 6, box: pbox(16, 44, 36, 16), damage: 28, hitstun: 14, blockstun: 10, kbx: 2 }), {
      cancelWindow: [4, 12],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Strike', 'HP', 'stand', [8, 4, 15], hit({ from: 8, to: 11, box: pbox(16, 48, 46, 20), damage: 58, hitstun: 20, blockstun: 13, kbx: 4 }), {
      cancelWindow: [8, 18],
      cancelInto: ['special', 'super'],
      starter: true,
    }),
    normal('crLK', 'Low Sweep', 'LK', 'crouch', [6, 3, 11], hit({ from: 6, to: 8, box: pbox(14, 8, 46, 14), damage: 26, hitstun: 14, blockstun: 11, kbx: 3, low: true })),
    normal('stHK', 'High Kick', 'HK', 'stand', [12, 4, 19], hit({ from: 12, to: 15, box: pbox(12, 34, 46, 46), damage: 74, hitstun: 22, blockstun: 15, kbx: 5, kby: 5, launch: true })),
    normal('jHK', 'Air Kick', 'HK', 'air', [7, 6, 8], hit({ from: 7, to: 12, box: pbox(8, 6, 38, 28), damage: 58, hitstun: 16, blockstun: 12, kbx: 2, kby: -2 }), { landingRecovery: 4 }),
    // --- Flow (A): fast pressure ---
    special('flurryA', 'Flow Palm', { motion: 'qcf', button: 'LP' }, [7, 12, 12], [
      hit({ from: 7, to: 9, box: pbox(14, 40, 44, 20), damage: 20, hitstun: 14, blockstun: 10, kbx: 1, hitId: 7701 }),
      hit({ from: 11, to: 13, box: pbox(14, 40, 46, 20), damage: 20, hitstun: 14, blockstun: 10, kbx: 1, hitId: 7702 }),
      hit({ from: 15, to: 18, box: pbox(14, 40, 48, 22), damage: 30, hitstun: 22, blockstun: 12, kbx: 5, hitId: 7703 }),
    ], { stanceOnly: 'A', selfVel: [{ frame: 1, x: px(3) }] }),
    special('dashA', 'Flow Step', { motion: 'qcb', button: 'LK' }, [4, 4, 10], hit({ from: 4, to: 8, box: pbox(12, 36, 40, 30), damage: 36, hitstun: 16, blockstun: 11, kbx: 3 }), {
      stanceOnly: 'A',
      invuln: [1, 6],
      invulnKind: 'strike',
      selfVel: [{ frame: 1, x: px(8) }, { frame: 8, x: 0 }],
    }),
    // --- Stone (B): defense / counters ---
    special('counterB', 'Stone Answer', { motion: 'qcb', button: 'HP' }, [3, 16, 22], hit({ from: 16, to: 20, box: pbox(10, 34, 50, 46), damage: 90, hitstun: 26, blockstun: 12, kbx: 6, kby: 5, launch: true }), {
      stanceOnly: 'B',
      armor: [3, 15],
      armorHits: 2,
    }),
    special('quakeB', 'Stone Quake', { motion: 'dp', button: 'HP' }, [10, 6, 22], hit({ from: 10, to: 15, box: pbox(-10, 4, 80, 20), damage: 60, hitstun: 24, blockstun: 16, kbx: 4, kby: 6, launch: true, low: true }), {
      stanceOnly: 'B',
      armor: [2, 10],
      armorHits: 1,
    }),
    superMove('unity', 'Unbroken Circle', { motion: 'qcf', button: 'S2', ctx: 'any' }, [6, 26, 26], [
      hit({ from: 6, to: 8, box: pbox(10, 34, 48, 40), damage: 30, hitstun: 20, blockstun: 14, kbx: 1, hitId: 7710 }),
      hit({ from: 12, to: 14, box: pbox(10, 34, 50, 42), damage: 24, hitstun: 18, blockstun: 12, kbx: 1, hitId: 7711 }),
      hit({ from: 18, to: 20, box: pbox(10, 34, 52, 44), damage: 24, hitstun: 18, blockstun: 12, kbx: 1, hitId: 7712 }),
      hit({ from: 24, to: 28, box: pbox(10, 30, 58, 50), damage: 66, hitstun: 30, blockstun: 16, kbx: 9, kby: 7, launch: true, hitId: 7713 }),
    ], { selfVel: [{ frame: 1, x: px(4) }] }),
  ],
  chains: { stLP: ['stHP', 'stHK'], crLK: ['stLP', 'stHP'] },
  combos: [
    ['stHP', 'flurryA'],
    ['stHP', 'quakeB'],
    ['stLP', 'stHP', 'unity'],
  ],
  voice: { hit: 240, ko: 150, special: 350 },
};

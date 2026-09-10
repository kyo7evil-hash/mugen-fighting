import { hit, normal, pbox, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 05 — Grigor "the Anvil": charge boxer. Hold back, then detonate. */
export const grigor: CharacterDef = {
  id: 'grigor',
  name: 'Grigor',
  archetype: 'Charge Boxer',
  bio: 'Bare-knuckle champion of nine ports. Patient, immovable, and then suddenly on top of you.',
  quote: 'I have been waiting. That was the whole plan.',
  stage: 'harbor',
  fullyTuned: false,
  stats: stats({
    maxHealth: 1060,
    walkFwd: px(2.0),
    walkBack: px(1.8),
    dashFwd: px(5.6),
    jumpVy: px(10.6),
    airMoveX: px(1.2),
    weight: 118,
  }),
  palette: {
    skin: '#d9a06e',
    hair: '#3a2a1a',
    primary: '#243a52',
    secondary: '#c0c0c8',
    accent: '#e2b33b',
    outline: '#12161c',
  },
  build: { height: 47, headR: 5, shoulder: 11, hip: 8, limb: 5, bulk: 2, style: 'boxer' },
  moves: [
    normal('stLP', 'Jab', 'LP', 'stand', [4, 3, 8], hit({ from: 4, to: 6, box: pbox(18, 48, 40, 16), damage: 30, hitstun: 14, blockstun: 10, kbx: 2 }), {
      cancelWindow: [4, 12],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Cross', 'HP', 'stand', [8, 4, 16], hit({ from: 8, to: 11, box: pbox(18, 50, 50, 20), damage: 64, hitstun: 20, blockstun: 14, kbx: 4 }), {
      cancelWindow: [8, 18],
      cancelInto: ['special', 'super'],
      starter: true,
    }),
    normal('crLK', 'Low Jab', 'LK', 'crouch', [6, 3, 11], hit({ from: 6, to: 8, box: pbox(16, 12, 42, 14), damage: 26, hitstun: 13, blockstun: 11, kbx: 2, low: true })),
    normal('stHK', 'Overhand', 'HK', 'stand', [14, 4, 22], hit({ from: 14, to: 17, box: pbox(14, 30, 46, 54), damage: 82, hitstun: 24, blockstun: 16, kbx: 4, kby: 4, launch: true, overhead: true })),
    normal('jHK', 'Falling Hammer', 'HK', 'air', [9, 6, 10], hit({ from: 9, to: 14, box: pbox(6, 4, 40, 30), damage: 74, hitstun: 20, blockstun: 14, kbx: 3, kby: -3 }), { landingRecovery: 6 }),
    special('dashpunch', 'Piston Rush', { charge: 'bf', button: 'HP' }, [12, 4, 22], hit({ from: 12, to: 17, box: pbox(16, 44, 56, 24), damage: 78, hitstun: 22, blockstun: 15, kbx: 7, kby: 2 }), {
      armor: [4, 12],
      armorHits: 1,
      selfVel: [{ frame: 1, x: px(9) }, { frame: 16, x: 0 }],
    }),
    special('bodyblow', 'Ripper', { charge: 'bf', button: 'LK' }, [10, 4, 18], hit({ from: 10, to: 14, box: pbox(14, 20, 50, 22), damage: 54, hitstun: 18, blockstun: 13, kbx: 4, low: true }), {
      selfVel: [{ frame: 1, x: px(6) }, { frame: 12, x: 0 }],
    }),
    special('upper', 'Skyfall Upper', { charge: 'ud', button: 'HP' }, [5, 12, 24], hit({ from: 5, to: 14, box: pbox(8, 40, 36, 66), damage: 84, hitstun: 24, blockstun: 12, kbx: 2, kby: 10, launch: true }), {
      invuln: [1, 7],
      invulnKind: 'strike',
      selfVel: [{ frame: 1, y: px(9) }],
      landingRecovery: 16,
    }),
    superMove('barrage', 'Anvil Barrage', { charge: 'bf', button: 'S1' }, [8, 24, 28], [
      hit({ from: 8, to: 10, box: pbox(14, 46, 52, 22), damage: 24, hitstun: 18, blockstun: 12, kbx: 1, hitId: 7501 }),
      hit({ from: 13, to: 15, box: pbox(14, 42, 54, 22), damage: 20, hitstun: 16, blockstun: 11, kbx: 1, hitId: 7502 }),
      hit({ from: 18, to: 20, box: pbox(14, 40, 56, 22), damage: 20, hitstun: 16, blockstun: 11, kbx: 1, hitId: 7503 }),
      hit({ from: 24, to: 28, box: pbox(14, 44, 60, 26), damage: 68, hitstun: 30, blockstun: 16, kbx: 10, kby: 4, launch: true, hitId: 7504 }),
    ], {
      armor: [2, 22],
      armorHits: 2,
      selfVel: [{ frame: 1, x: px(6) }, { frame: 22, x: 0 }],
    }),
  ],
  chains: { stLP: ['stHP', 'stHK'], crLK: ['stLP', 'stHP'] },
  combos: [
    ['stHP', 'dashpunch'],
    ['stLP', 'stHP', 'barrage'],
    ['crLK', 'stHP', 'upper'],
  ],
  voice: { hit: 170, ko: 100, special: 210 },
};

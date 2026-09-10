import { hit, normal, pbox, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 04 — Rieko "Redline": relentless rekka rushdown. Fragile, terrifying. */
export const rieko: CharacterDef = {
  id: 'rieko',
  name: 'Rieko',
  archetype: 'Rushdown',
  bio: 'Street-race champion turned fighter. Only knows one gear: forward.',
  quote: 'Blink and you already lost.',
  stage: 'overpass',
  fullyTuned: false,
  stats: stats({
    maxHealth: 900,
    walkFwd: px(2.9),
    walkBack: px(2.2),
    dashFwd: px(7.6),
    dashFwdFrames: 16,
    jumpVy: px(11.2),
    airMoveX: px(2.1),
  }),
  palette: {
    skin: '#e0a074',
    hair: '#d23b3b',
    primary: '#22232a',
    secondary: '#e23b3b',
    accent: '#ffd23b',
    outline: '#141414',
  },
  build: { height: 45, headR: 5, shoulder: 8, hip: 6, limb: 4, bulk: 0, style: 'hoodie' },
  moves: [
    normal('stLP', 'Quick Jab', 'LP', 'stand', [3, 2, 6], hit({ from: 3, to: 4, box: pbox(16, 42, 32, 14), damage: 24, hitstun: 13, blockstun: 9, kbx: 1 }), {
      cancelWindow: [3, 10],
      cancelInto: ['special', 'super', 'stLP', 'crLK', 'stHP'],
    }),
    normal('stHP', 'Elbow', 'HP', 'stand', [6, 3, 12], hit({ from: 6, to: 8, box: pbox(16, 46, 40, 20), damage: 52, hitstun: 19, blockstun: 12, kbx: 3 }), {
      cancelWindow: [6, 14],
      cancelInto: ['special', 'super'],
      starter: true,
    }),
    normal('crLK', 'Toe Tap', 'LK', 'crouch', [4, 2, 7], hit({ from: 4, to: 5, box: pbox(14, 8, 36, 12), damage: 20, hitstun: 12, blockstun: 10, kbx: 1, low: true }), {
      cancelWindow: [4, 10],
      cancelInto: ['special', 'super', 'crLK', 'stHP'],
    }),
    normal('stHK', 'Axe Kick', 'HK', 'stand', [12, 3, 18], hit({ from: 12, to: 14, box: pbox(12, 20, 40, 60), damage: 66, hitstun: 22, blockstun: 16, kbx: 3, overhead: true, kby: 2 })),
    normal('jHK', 'Scissor Kick', 'HK', 'air', [6, 6, 8], hit({ from: 6, to: 11, box: pbox(8, 6, 36, 30), damage: 58, hitstun: 16, blockstun: 12, kbx: 2, kby: -2 }), { landingRecovery: 4 }),
    special('rush1', 'Redline 1', { motion: 'qcf', button: 'LP' }, [8, 3, 16], hit({ from: 8, to: 10, box: pbox(14, 40, 48, 22), damage: 36, hitstun: 16, blockstun: 12, kbx: 2 }), {
      selfVel: [{ frame: 1, x: px(6) }, { frame: 9, x: 0 }],
      cancelWindow: [8, 20],
      cancelInto: ['rush2', 'super'],
    }),
    special('rush2', 'Redline 2', { motion: 'qcf', button: 'LP' }, [7, 3, 16], hit({ from: 7, to: 9, box: pbox(12, 30, 50, 22), damage: 30, hitstun: 16, blockstun: 12, kbx: 2, low: true }), {
      selfVel: [{ frame: 1, x: px(5) }],
      cancelWindow: [7, 20],
      cancelInto: ['rush3', 'super'],
    }),
    special('rush3', 'Redline 3', { motion: 'qcf', button: 'LP' }, [9, 4, 24], hit({ from: 9, to: 13, box: pbox(12, 34, 52, 40), damage: 44, hitstun: 24, blockstun: 14, kbx: 7, kby: 5, launch: true }), {
      selfVel: [{ frame: 1, x: px(4) }],
    }),
    special('dive', 'Meteor Dive', { motion: 'qcb', button: 'HK', ctx: 'air' }, [6, 10, 10], hit({ from: 6, to: 15, box: pbox(4, 2, 34, 30), damage: 54, hitstun: 18, blockstun: 14, kbx: 2, kby: -4 }), {
      airOk: true,
      selfVel: [{ frame: 1, x: px(5), y: -px(10) }],
      landingRecovery: 8,
    }),
    superMove('overdrive', 'Full Overdrive', { motion: 'qcf', button: 'S1' }, [7, 20, 26], [
      hit({ from: 7, to: 9, box: pbox(12, 40, 50, 24), damage: 30, hitstun: 20, blockstun: 14, kbx: 1, hitId: 7401 }),
      hit({ from: 12, to: 14, box: pbox(12, 34, 52, 24), damage: 24, hitstun: 18, blockstun: 12, kbx: 1, hitId: 7402 }),
      hit({ from: 17, to: 19, box: pbox(12, 30, 54, 24), damage: 24, hitstun: 18, blockstun: 12, kbx: 1, hitId: 7403 }),
      hit({ from: 22, to: 26, box: pbox(12, 34, 58, 40), damage: 60, hitstun: 30, blockstun: 16, kbx: 9, kby: 6, launch: true, hitId: 7404 }),
    ], {
      selfVel: [{ frame: 1, x: px(7) }, { frame: 20, x: px(3) }],
    }),
  ],
  chains: {
    stLP: ['stLP', 'crLK', 'stHP', 'stHK'],
    crLK: ['crLK', 'stHP'],
    stHP: ['stHK'],
  },
  combos: [
    ['stLP', 'crLK', 'stHP', 'rush1', 'rush2', 'rush3'],
    ['stHP', 'rush1', 'rush2', 'overdrive'],
    ['crLK', 'crLK', 'stHP', 'overdrive'],
  ],
  voice: { hit: 300, ko: 190, special: 420 },
};

import { hit, normal, pbox, proj, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 10 — Goliath "the Wall": long-reach bruiser and Arcade final boss. */
export const goliath: CharacterDef = {
  id: 'goliath',
  name: 'Goliath',
  archetype: 'Reach Bruiser',
  bio: 'Nobody agrees on what he is. Everybody agrees to stay outside his arm span.',
  quote: 'The distance was never yours to set.',
  stage: 'colossus',
  fullyTuned: false,
  stats: stats({
    maxHealth: 1180,
    walkFwd: px(1.8),
    walkBack: px(1.5),
    dashFwd: px(5.0),
    dashFwdFrames: 22,
    jumpVy: px(10.8),
    gravity: px(0.66),
    airMoveX: px(1.1),
    weight: 142,
    prejump: 6,
  }),
  palette: {
    skin: '#9aa0a8',
    hair: '#2a2e34',
    primary: '#3a3f2a',
    secondary: '#5a3a22',
    accent: '#ff6a3b',
    outline: '#12140f',
  },
  build: { height: 52, headR: 6, shoulder: 14, hip: 10, limb: 7, bulk: 3, style: 'armor' },
  moves: [
    normal('stLP', 'Backhand', 'LP', 'stand', [6, 3, 10], hit({ from: 6, to: 8, box: pbox(20, 52, 56, 22), damage: 38, hitstun: 15, blockstun: 12, kbx: 3 }), {
      cancelWindow: [6, 14],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Long Smash', 'HP', 'stand', [11, 5, 20], hit({ from: 11, to: 15, box: pbox(20, 44, 90, 24), damage: 82, hitstun: 22, blockstun: 16, kbx: 5, kby: 2 }), {
      cancelWindow: [11, 22],
      cancelInto: ['special', 'super'],
      starter: true,
    }),
    normal('crLK', 'Low Stomp', 'LK', 'crouch', [8, 3, 14], hit({ from: 8, to: 10, box: pbox(18, 8, 60, 16), damage: 34, hitstun: 15, blockstun: 12, kbx: 3, low: true })),
    normal('stHK', 'Guillotine', 'HK', 'stand', [15, 5, 24], hit({ from: 15, to: 19, box: pbox(16, 20, 60, 70), damage: 96, hitstun: 26, blockstun: 18, kbx: 5, kby: 6, launch: true, overhead: true })),
    normal('jHK', 'Meteor Fist', 'HK', 'air', [10, 8, 12], hit({ from: 10, to: 17, box: pbox(6, 0, 50, 34), damage: 88, hitstun: 22, blockstun: 15, kbx: 4, kby: -3 }), { landingRecovery: 8 }),
    special('shoulder', 'Wall Charge', { motion: 'qcf', button: 'HP' }, [14, 6, 24], hit({ from: 14, to: 22, box: pbox(16, 34, 60, 54), damage: 84, hitstun: 24, blockstun: 16, kbx: 8, kby: 2 }), {
      armor: [3, 18],
      armorHits: 2,
      selfVel: [{ frame: 1, x: px(8) }, { frame: 20, x: 0 }],
    }),
    special('pound', 'Ground Pound', { motion: 'dp', button: 'HP' }, [12, 8, 26], hit({ from: 12, to: 20, box: pbox(-20, 4, 110, 24), damage: 74, hitstun: 24, blockstun: 18, kbx: 4, kby: 7, launch: true }), {
      armor: [2, 12],
      armorHits: 1,
    }),
    special('swat', 'Skyward Swat', { motion: 'qcb', button: 'HP' }, [9, 6, 22], hit({ from: 9, to: 16, box: pbox(6, 40, 40, 70), damage: 70, hitstun: 22, blockstun: 12, kbx: 3, kby: 8, launch: true }), {
      invuln: [4, 12],
      invulnKind: 'air',
    }),
    superMove('collapse', 'Total Collapse', { motion: 'qcf', button: 'S1' }, [10, 10, 34], [
      hit({ from: 10, to: 12, box: pbox(16, 40, 70, 50), damage: 50, hitstun: 24, blockstun: 18, kbx: 2, hitId: 7810 }),
    ], {
      armor: [1, 10],
      armorHits: 3,
      spawns: [
        proj({ frame: 12, kind: 'quakewave', ox: 40, oy: 20, vx: 6, life: 80, hits: 3, box: pbox(-24, -18, 48, 40), damage: 40, hitstun: 24, blockstun: 14, kbx: 4, kby: 4, capped: false }),
      ],
    }),
  ],
  chains: { stLP: ['stHP', 'stHK'], crLK: ['stLP', 'stHP'] },
  combos: [
    ['stHP', 'shoulder'],
    ['stHP', 'pound'],
    ['stLP', 'stHP', 'collapse'],
  ],
  voice: { hit: 120, ko: 70, special: 150 },
};

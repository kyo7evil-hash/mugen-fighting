import { hit, normal, pbox, proj, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 06 — Anira "Kite": airborne mix-up specialist. Never where you swing. */
export const anira: CharacterDef = {
  id: 'anira',
  name: 'Anira',
  archetype: 'Aerial',
  bio: 'Raised on temple rooftops. Treats the ground as a suggestion.',
  quote: 'Look up. Too late.',
  stage: 'rooftops',
  fullyTuned: false,
  stats: stats({
    maxHealth: 880,
    walkFwd: px(2.5),
    walkBack: px(2.2),
    jumpVy: px(10.4),
    gravity: px(0.5),
    airMoveX: px(2.4),
    jumps: 2,
    airdash: 'free',
    dashFwd: px(7.0),
  }),
  palette: {
    skin: '#e6ae82',
    hair: '#33244a',
    primary: '#6a3aa0',
    secondary: '#f0e6d0',
    accent: '#ff9edb',
    outline: '#171021',
  },
  build: { height: 44, headR: 5, shoulder: 7, hip: 6, limb: 4, bulk: 0, style: 'ninja' },
  moves: [
    normal('stLP', 'Palm', 'LP', 'stand', [4, 3, 7], hit({ from: 4, to: 6, box: pbox(16, 40, 34, 16), damage: 26, hitstun: 13, blockstun: 10, kbx: 2 }), {
      cancelWindow: [4, 12],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Twin Strike', 'HP', 'stand', [7, 4, 14], hit({ from: 7, to: 10, box: pbox(16, 44, 42, 22), damage: 54, hitstun: 19, blockstun: 12, kbx: 3 }), {
      cancelWindow: [7, 16],
      cancelInto: ['special', 'super', 'jump'],
      starter: true,
    }),
    normal('crLK', 'Ankle Sweep', 'LK', 'crouch', [5, 3, 10], hit({ from: 5, to: 7, box: pbox(14, 8, 40, 12), damage: 24, hitstun: 13, blockstun: 10, kbx: 2, low: true })),
    normal('stHK', 'Rising Knee', 'HK', 'stand', [9, 4, 18], hit({ from: 9, to: 12, box: pbox(10, 34, 34, 52), damage: 62, hitstun: 22, blockstun: 14, kbx: 2, kby: 8, launch: true })),
    normal('jHK', 'Air Slash', 'HK', 'air', [6, 6, 8], hit({ from: 6, to: 11, box: pbox(8, 8, 40, 26), damage: 56, hitstun: 16, blockstun: 12, kbx: 2, kby: -1 }), { landingRecovery: 3 }),
    special('divekick', 'Stoop', { motion: 'qcb', button: 'HK', ctx: 'air' }, [5, 12, 8], hit({ from: 5, to: 16, box: pbox(2, 0, 34, 30), damage: 52, hitstun: 16, blockstun: 14, kbx: 2, kby: -5, overhead: true }), {
      airOk: true,
      selfVel: [{ frame: 1, x: px(4), y: -px(11) }],
      landingRecovery: 6,
    }),
    special('feather', 'Feather Dart', { motion: 'qcf', button: 'LP', ctx: 'any' }, [9, 2, 14], [], {
      airOk: true,
      spawns: [proj({ frame: 9, kind: 'feather', ox: 20, oy: 40, vx: 6.4, life: 70, box: pbox(-8, -6, 18, 14), damage: 34, hitstun: 16, blockstun: 10, kbx: 3 })],
    }),
    special('updraft', 'Updraft Kick', { motion: 'dp', button: 'HK' }, [6, 12, 20], hit({ from: 6, to: 14, box: pbox(8, 36, 32, 60), damage: 66, hitstun: 22, blockstun: 12, kbx: 2, kby: 9, launch: true }), {
      invuln: [1, 8],
      invulnKind: 'strike',
      selfVel: [{ frame: 1, y: px(8) }],
      landingRecovery: 14,
      airOk: true,
    }),
    superMove('tempest', 'Falcon Tempest', { motion: 'qcb', button: 'S1', ctx: 'any' }, [7, 22, 20], [
      hit({ from: 7, to: 9, box: pbox(6, 10, 40, 40), damage: 26, hitstun: 18, blockstun: 12, kbx: 1, kby: -2, hitId: 7601 }),
      hit({ from: 12, to: 14, box: pbox(6, 8, 42, 42), damage: 22, hitstun: 16, blockstun: 11, kbx: 1, kby: -2, hitId: 7602 }),
      hit({ from: 17, to: 22, box: pbox(6, 6, 46, 46), damage: 58, hitstun: 28, blockstun: 16, kbx: 6, kby: 6, launch: true, hitId: 7603 }),
    ], {
      airOk: true,
      selfVel: [{ frame: 1, x: px(5), y: -px(6) }],
      landingRecovery: 10,
    }),
  ],
  chains: { stLP: ['stHP', 'stHK'], crLK: ['stLP', 'stHP'] },
  combos: [
    ['stHP', 'stHK', 'updraft'],
    ['jHK', 'stLP', 'stHP', 'tempest'],
    ['crLK', 'stLP', 'feather'],
  ],
  voice: { hit: 320, ko: 210, special: 460 },
};

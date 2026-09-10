import { hit, normal, pbox, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 09 — Sable "the Mirror": counter fighter. Bait the swing, punish the whiff. */
export const sable: CharacterDef = {
  id: 'sable',
  name: 'Sable',
  archetype: 'Counter',
  bio: 'A duelist who has made a career of the half-second after your attack misses.',
  quote: 'After you.',
  stage: 'hall',
  fullyTuned: false,
  stats: stats({ maxHealth: 950, walkFwd: px(2.3), walkBack: px(2.4), dashBack: px(7.8), weight: 100 }),
  palette: {
    skin: '#dba57c',
    hair: '#8a8f99',
    primary: '#20242c',
    secondary: '#9a1f2f',
    accent: '#d8d8e0',
    outline: '#101216',
  },
  build: { height: 46, headR: 5, shoulder: 9, hip: 7, limb: 4, bulk: 1, style: 'coat' },
  moves: [
    normal('stLP', 'Riposte Jab', 'LP', 'stand', [4, 3, 7], hit({ from: 4, to: 6, box: pbox(18, 44, 38, 16), damage: 28, hitstun: 14, blockstun: 10, kbx: 2 }), {
      cancelWindow: [4, 12],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Lunge', 'HP', 'stand', [8, 4, 16], hit({ from: 8, to: 11, box: pbox(18, 48, 54, 18), damage: 60, hitstun: 20, blockstun: 13, kbx: 4 }), {
      cancelWindow: [8, 18],
      cancelInto: ['special', 'super'],
      starter: true,
    }),
    normal('crLK', 'Low Line', 'LK', 'crouch', [6, 3, 11], hit({ from: 6, to: 8, box: pbox(16, 8, 48, 14), damage: 26, hitstun: 14, blockstun: 11, kbx: 3, low: true })),
    normal('stHK', 'Rising Cut', 'HK', 'stand', [11, 4, 20], hit({ from: 11, to: 14, box: pbox(12, 34, 44, 50), damage: 76, hitstun: 22, blockstun: 15, kbx: 4, kby: 6, launch: true })),
    normal('jHK', 'Air Cut', 'HK', 'air', [7, 6, 8], hit({ from: 7, to: 12, box: pbox(8, 6, 38, 28), damage: 58, hitstun: 16, blockstun: 12, kbx: 2, kby: -2 }), { landingRecovery: 4 }),
    special('counter', 'Mirror Guard', { motion: 'qcb', button: 'HP' }, [3, 14, 24], hit({ from: 18, to: 22, box: pbox(10, 34, 52, 46), damage: 96, hitstun: 26, blockstun: 12, kbx: 6, kby: 6, launch: true }), {
      armor: [3, 15],
      armorHits: 2,
    }),
    special('parry', 'Beat Parry', { motion: 'qcf', button: 'LK' }, [5, 8, 16], hit({ from: 5, to: 10, box: pbox(12, 34, 40, 40), damage: 40, hitstun: 18, blockstun: 10, kbx: 4 }), {
      invuln: [1, 9],
      invulnKind: 'strike',
    }),
    special('step', 'Shadow Step', { motion: 'qcb', button: 'LK' }, [3, 3, 12], [], {
      invuln: [1, 12],
      invulnKind: 'all',
      selfVel: [{ frame: 1, x: -px(10) }, { frame: 6, x: 0 }],
    }),
    superMove('verdict', 'Final Verdict', { motion: 'qcf', button: 'S1' }, [4, 10, 30], [
      hit({ from: 4, to: 6, box: pbox(10, 30, 60, 54), damage: 60, hitstun: 24, blockstun: 16, kbx: 2, hitId: 7901 }),
      hit({ from: 10, to: 14, box: pbox(10, 26, 70, 58), damage: 120, hitstun: 40, blockstun: 20, kbx: 10, kby: 8, launch: true, hitId: 7902 }),
    ], {
      invuln: [1, 10],
      invulnKind: 'all',
      selfVel: [{ frame: 1, x: px(6) }, { frame: 8, x: 0 }],
    }),
  ],
  chains: { stLP: ['stHP', 'stHK'], crLK: ['stLP', 'stHP'] },
  combos: [
    ['stHP', 'parry'],
    ['stHP', 'stHK', 'verdict'],
    ['stLP', 'stHP', 'counter'],
  ],
  voice: { hit: 230, ko: 150, special: 340 },
};

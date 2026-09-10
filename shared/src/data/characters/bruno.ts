import { hit, move, normal, pbox, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 02 — Bruno "Bear": slow armoured grappler. Command grabs, huge reward up close. */
export const bruno: CharacterDef = {
  id: 'bruno',
  name: 'Bruno',
  archetype: 'Grappler',
  bio: 'A lumber-camp strongman. If he gets his hands on you, the round is half over.',
  quote: 'Come here. This will only hurt forever.',
  stage: 'timberyard',
  fullyTuned: true,
  stats: stats({
    maxHealth: 1220,
    walkFwd: px(1.9),
    walkBack: px(1.5),
    dashFwd: px(5.2),
    dashBack: px(5.4),
    dashFwdFrames: 20,
    jumpVy: px(11.0),
    weight: 132,
    prejump: 5,
  }),
  palette: {
    skin: '#d99a6c',
    hair: '#5a3a22',
    primary: '#4a5a3a',
    secondary: '#7a4a2a',
    accent: '#c9a24b',
    outline: '#1c150f',
  },
  build: { height: 48, headR: 5, shoulder: 12, hip: 9, limb: 6, bulk: 3, style: 'bruiser' },
  moves: [
    normal('stLP', 'Hook', 'LP', 'stand', [5, 3, 9], hit({ from: 5, to: 7, box: pbox(18, 46, 40, 22), damage: 36, hitstun: 15, blockstun: 11, kbx: 2 }), {
      cancelWindow: [5, 13],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Sledge', 'HP', 'stand', [10, 5, 20], hit({ from: 10, to: 14, box: pbox(16, 30, 54, 60), damage: 76, hitstun: 22, blockstun: 15, kbx: 3, kby: 3 }), {
      armor: [4, 12],
      armorHits: 1,
      starter: true,
    }),
    normal('crLK', 'Boot', 'LK', 'crouch', [6, 3, 12], hit({ from: 6, to: 8, box: pbox(16, 10, 46, 16), damage: 30, hitstun: 14, blockstun: 11, kbx: 2, low: true })),
    normal('stHK', 'Body Check', 'HK', 'stand', [13, 4, 22], hit({ from: 13, to: 17, box: pbox(14, 26, 52, 60), damage: 88, hitstun: 24, blockstun: 16, kbx: 8, kby: 5, launch: true }), { starter: true }),
    normal('jHK', 'Elbow Drop', 'HK', 'air', [9, 8, 10], hit({ from: 9, to: 16, box: pbox(6, 2, 44, 30), damage: 82, hitstun: 20, blockstun: 14, kbx: 3, kby: -3 }), { landingRecovery: 6 }),
    special('grab', 'Bear Hug', { motion: '360', button: 'LP' }, [5, 2, 26], hit({ from: 5, to: 6, box: pbox(0, 20, px(52), 60), damage: 150, hitstun: 44, blockstun: 0, hitstop: 12, kbx: -6, kby: 5, grab: true, launch: true })),
    special('lariat', 'Iron Lariat', { motion: 'qcb', button: 'HP' }, [9, 20, 16], [
      hit({ from: 9, to: 14, box: pbox(-30, 40, 92, 40), damage: 40, hitstun: 16, blockstun: 11, kbx: 2, hitId: 6001 }),
      hit({ from: 15, to: 22, box: pbox(-30, 40, 92, 40), damage: 46, hitstun: 24, blockstun: 13, kbx: 6, kby: 4, launch: true, hitId: 6002 }),
    ], { armor: [3, 20], armorHits: 1 }),
    special('headbutt', 'Charging Headbutt', { motion: 'dp', button: 'HP' }, [8, 10, 20], hit({ from: 8, to: 16, box: pbox(14, 44, 46, 34), damage: 80, hitstun: 22, blockstun: 14, kbx: 6, kby: 2 }), {
      armor: [2, 14],
      armorHits: 1,
      selfVel: [{ frame: 1, x: px(7) }, { frame: 12, x: 0 }],
    }),
    superMove('backbreaker', 'Grave Breaker', { motion: '360', button: 'S1' }, [4, 3, 40], hit({ from: 4, to: 6, box: pbox(0, 20, px(58), 66), damage: 300, hitstun: 60, blockstun: 0, hitstop: 16, kbx: -4, kby: 8, grab: true, launch: true }), {
      invuln: [1, 6],
      invulnKind: 'all',
    }),
    move({
      id: 'airgrab',
      name: 'Sky Hug',
      type: 'special',
      trigger: { kind: 'motion', motion: '360', button: 'LK', ctx: 'air' },
      startup: 4,
      active: 3,
      recovery: 18,
      airOk: true,
      hits: [hit({ from: 4, to: 7, box: pbox(0, 10, px(46), 56), damage: 120, hitstun: 40, blockstun: 0, hitstop: 12, kbx: -5, kby: 4, grab: true, airGrab: true, launch: true })],
    }),
  ],
  chains: { stLP: ['stHP', 'stHK'] },
  combos: [
    ['stHP', 'headbutt'],
    ['stLP', 'grab'],
    ['stHK', 'backbreaker'],
    ['jHK', 'stHP', 'lariat'],
  ],
  voice: { hit: 150, ko: 90, special: 180 },
};

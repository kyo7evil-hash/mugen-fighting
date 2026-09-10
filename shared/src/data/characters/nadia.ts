import { hit, move, normal, pbox, proj, special, superMove } from '../moves.js';
import { px, stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 08 — Nadia "Two-Shadows": puppeteer. S2 summons the shade; qcf+S2 orders it to strike. */
export const nadia: CharacterDef = {
  id: 'nadia',
  name: 'Nadia',
  archetype: 'Puppeteer',
  bio: 'Bargained with her own shadow. Now it fights beside her — on a timer, and a leash.',
  quote: 'We outnumber you.',
  stage: 'gallery',
  fullyTuned: false,
  stats: stats({ maxHealth: 900, walkFwd: px(2.2), weight: 94 }),
  palette: {
    skin: '#d8a07a',
    hair: '#141018',
    primary: '#3a2f52',
    secondary: '#6a2f4a',
    accent: '#8affd8',
    outline: '#0f0c14',
  },
  build: { height: 46, headR: 5, shoulder: 8, hip: 6, limb: 4, bulk: 0, style: 'coat' },
  moves: [
    move({
      id: 'summon',
      name: 'Call Shade',
      type: 'special',
      trigger: { kind: 'normal', button: 'S2', ctx: 'stand' },
      startup: 6,
      active: 1,
      recovery: 16,
      puppet: 'summon',
      hits: [],
    }),
    move({
      id: 'recall',
      name: 'Dismiss Shade',
      type: 'special',
      trigger: { kind: 'command', button: 'S2', dir: 'back', ctx: 'stand' },
      startup: 4,
      active: 1,
      recovery: 8,
      puppet: 'recall',
      hits: [],
    }),
    normal('stLP', 'Jab', 'LP', 'stand', [4, 3, 8], hit({ from: 4, to: 6, box: pbox(16, 42, 34, 16), damage: 26, hitstun: 13, blockstun: 10, kbx: 2 }), {
      cancelWindow: [4, 12],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Rake', 'HP', 'stand', [8, 4, 15], hit({ from: 8, to: 11, box: pbox(16, 44, 46, 20), damage: 54, hitstun: 19, blockstun: 12, kbx: 3 }), {
      cancelWindow: [8, 18],
      cancelInto: ['special', 'super'],
      starter: true,
    }),
    normal('crLK', 'Low Claw', 'LK', 'crouch', [5, 3, 10], hit({ from: 5, to: 7, box: pbox(14, 8, 42, 14), damage: 24, hitstun: 13, blockstun: 10, kbx: 2, low: true })),
    normal('stHK', 'Spin Kick', 'HK', 'stand', [11, 4, 19], hit({ from: 11, to: 14, box: pbox(12, 32, 44, 46), damage: 68, hitstun: 22, blockstun: 15, kbx: 5, kby: 5, launch: true })),
    normal('jHK', 'Air Claw', 'HK', 'air', [7, 6, 8], hit({ from: 7, to: 12, box: pbox(8, 6, 38, 28), damage: 56, hitstun: 16, blockstun: 12, kbx: 2, kby: -2 }), { landingRecovery: 4 }),
    special('order', 'Shade Strike', { motion: 'qcf', button: 'S2' }, [8, 4, 18], [], {
      puppet: 'command',
      spawns: [proj({ frame: 8, kind: 'shadebolt', ox: 22, oy: 42, vx: 4.6, life: 70, box: pbox(-10, -8, 20, 16), damage: 28, hitstun: 16, blockstun: 10, kbx: 3 })],
    }),
    special('bolt', 'Ink Bolt', { motion: 'qcf', button: 'LP' }, [12, 2, 18], [], {
      spawns: [proj({ frame: 12, kind: 'inkbolt', ox: 24, oy: 46, vx: 5.6, life: 84, box: pbox(-12, -8, 24, 18), damage: 42, hitstun: 18, blockstun: 12, kbx: 4 })],
    }),
    special('phase', 'Shadow Slip', { motion: 'qcb', button: 'LK' }, [4, 4, 14], hit({ from: 4, to: 7, box: pbox(10, 34, 34, 30), damage: 32, hitstun: 14, blockstun: 10, kbx: 3 }), {
      invuln: [1, 8],
      invulnKind: 'strike',
      selfVel: [{ frame: 1, x: px(7) }, { frame: 8, x: 0 }],
    }),
    superMove('eclipse', 'Total Eclipse', { motion: 'qcf', button: 'S1', ctx: 'any' }, [10, 8, 30], [], {
      spawns: [
        proj({ frame: 10, kind: 'eclipse', ox: 20, oy: 60, vx: 4.5, life: 90, hits: 6, box: pbox(-26, -30, 52, 62), damage: 34, hitstun: 22, blockstun: 12, kbx: 2, capped: false }),
      ],
    }),
  ],
  chains: { stLP: ['stHP', 'stHK'], crLK: ['stLP', 'stHP'] },
  combos: [
    ['stHP', 'bolt'],
    ['stHP', 'stHK', 'eclipse'],
    ['crLK', 'stLP', 'order'],
  ],
  voice: { hit: 250, ko: 160, special: 360 },
};

import { hit, move, normal, pbox, proj, special, superMove } from '../moves.js';
import { stats } from '../dsl.js';
import type { CharacterDef } from '../types.js';

/** 03 — Vesper "the Fletcher": keepaway zoner. Owns the ground she can see. */
export const vesper: CharacterDef = {
  id: 'vesper',
  name: 'Vesper',
  archetype: 'Zoner',
  bio: 'A ridgeline hunter who has never lost a fight she started at range. Up close is another story.',
  quote: 'Every step you take is one I already aimed at.',
  stage: 'ridge',
  fullyTuned: true,
  stats: stats({ maxHealth: 940, walkFwd: stats().walkFwd, weight: 90, dashBack: Math.round(7.6 * 256) }),
  palette: {
    skin: '#c78e64',
    hair: '#7b9a4a',
    primary: '#2f4a3a',
    secondary: '#6a5a3a',
    accent: '#9adcff',
    outline: '#141a14',
  },
  build: { height: 46, headR: 5, shoulder: 8, hip: 6, limb: 4, bulk: 0, style: 'coat' },
  moves: [
    normal('stLP', 'Jab', 'LP', 'stand', [5, 3, 8], hit({ from: 5, to: 7, box: pbox(18, 44, 40, 14), damage: 28, hitstun: 13, blockstun: 10, kbx: 2 }), {
      cancelWindow: [5, 12],
      cancelInto: ['special', 'super'],
    }),
    normal('stHP', 'Longpoke', 'HP', 'stand', [9, 4, 16], hit({ from: 9, to: 12, box: pbox(20, 50, 72, 16), damage: 58, hitstun: 20, blockstun: 13, kbx: 5 }), {
      cancelWindow: [9, 18],
      cancelInto: ['special', 'super'],
    }),
    normal('crLK', 'Slide Toe', 'LK', 'crouch', [7, 3, 12], hit({ from: 7, to: 9, box: pbox(16, 8, 66, 14), damage: 30, hitstun: 14, blockstun: 11, kbx: 3, low: true })),
    normal('stHK', 'Spin Sweep', 'HK', 'stand', [12, 4, 20], hit({ from: 12, to: 15, box: pbox(14, 8, 60, 18), damage: 72, hitstun: 22, blockstun: 15, kbx: 6, low: true, kby: 3, launch: true })),
    normal('jHK', 'Divekick', 'HK', 'air', [7, 8, 8], hit({ from: 7, to: 14, box: pbox(6, 4, 34, 30), damage: 62, hitstun: 16, blockstun: 12, kbx: 3, kby: -3 }), { landingRecovery: 5 }),
    special('needle', 'Needle Shot', { motion: 'qcf', button: 'LP' }, [10, 2, 16], [], {
      spawns: [proj({ frame: 10, kind: 'needle', ox: 24, oy: 48, vx: 8.2, life: 80, box: pbox(-10, -4, 20, 10), damage: 32, hitstun: 16, blockstun: 10, kbx: 3 })],
    }),
    special('trap', 'Falling Snare', { motion: 'qcb', button: 'HP' }, [14, 2, 22], [], {
      spawns: [proj({ frame: 14, kind: 'snare', ox: 30, oy: 90, vx: 2.6, vy: 1, gravity: 0.5, life: 110, box: pbox(-12, -12, 24, 24), damage: 46, hitstun: 26, blockstun: 14, kbx: 3, kby: 5 })],
    }),
    special('pin', 'Pinning Bolt', { motion: 'qcf', button: 'HK' }, [16, 2, 20], [], {
      spawns: [proj({ frame: 16, kind: 'bolt', ox: 26, oy: 42, vx: 5, life: 100, box: pbox(-14, -8, 28, 18), damage: 44, hitstun: 34, blockstun: 16, kbx: 1 })],
    }),
    special('kick', 'Pushoff Kick', { motion: 'dp', button: 'LK' }, [6, 6, 18], hit({ from: 6, to: 11, box: pbox(10, 30, 40, 40), damage: 40, hitstun: 16, blockstun: 10, kbx: 4 }), {
      invuln: [1, 10],
      invulnKind: 'air',
      selfVel: [{ frame: 1, x: -Math.round(6 * 256), y: Math.round(6 * 256) }],
      airOk: true,
    }),
    superMove('storm', 'Arrow Storm', { motion: 'qcf', button: 'S1' }, [12, 6, 34], [], {
      spawns: [
        proj({ frame: 12, kind: 'needle', ox: 22, oy: 60, vx: 7, life: 80, box: pbox(-10, -6, 20, 12), damage: 26, hitstun: 16, blockstun: 10, kbx: 2, capped: false }),
        proj({ frame: 16, kind: 'needle', ox: 22, oy: 50, vx: 8, life: 80, box: pbox(-10, -6, 20, 12), damage: 26, hitstun: 16, blockstun: 10, kbx: 2, capped: false }),
        proj({ frame: 20, kind: 'needle', ox: 22, oy: 40, vx: 9, life: 80, box: pbox(-10, -6, 20, 12), damage: 26, hitstun: 16, blockstun: 10, kbx: 2, capped: false }),
        proj({ frame: 24, kind: 'needle', ox: 22, oy: 66, vx: 6, life: 80, box: pbox(-10, -6, 20, 12), damage: 30, hitstun: 30, blockstun: 14, kbx: 6, capped: false }),
      ],
    }),
  ],
  chains: { stLP: ['stHP'], crLK: ['stHP'] },
  combos: [
    ['stHP', 'needle'],
    ['crLK', 'stHP', 'pin'],
    ['stHK', 'storm'],
  ],
  voice: { hit: 260, ko: 170, special: 380 },
};

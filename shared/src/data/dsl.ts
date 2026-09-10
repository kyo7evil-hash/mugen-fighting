import { UNIT } from '../sim/constants.js';
import type { CharStats } from './types.js';

/** pixels -> integer units (velocities must stay integers for lockstep determinism). */
export const px = (n: number): number => Math.round(n * UNIT);

export function stats(over: Partial<CharStats> = {}): CharStats {
  return {
    maxHealth: 1000,
    walkFwd: px(2.3),
    walkBack: px(1.9),
    dashFwd: px(6.4),
    dashBack: px(7.0),
    dashFwdFrames: 18,
    backdashFrames: 20,
    backdashInvuln: 8,
    jumpVy: px(11.6),
    gravity: px(0.62),
    airMoveX: px(1.7),
    jumps: 1,
    airdash: 'none',
    prejump: 4,
    weight: 100,
    ...over,
  };
}

import { IN } from './constants.js';
import type { MotionName } from './types.js';

/** Convert an input bitmask to a numpad digit RELATIVE to facing (6 = toward opponent). */
export function relDir(bits: number, facing: 1 | -1): number {
  const up = (bits & IN.UP) !== 0;
  const down = (bits & IN.DOWN) !== 0;
  const left = (bits & IN.LEFT) !== 0;
  const right = (bits & IN.RIGHT) !== 0;
  let fwd = false;
  let back = false;
  if (facing === 1) {
    fwd = right;
    back = left;
  } else {
    fwd = left;
    back = right;
  }
  const h = fwd ? 1 : back ? -1 : 0; // +1 forward
  const v = up ? 1 : down ? -1 : 0; // +1 up
  // map (h,v) -> numpad
  if (h === 0 && v === 0) return 5;
  if (h === 0 && v === 1) return 8;
  if (h === 0 && v === -1) return 2;
  if (h === 1 && v === 0) return 6;
  if (h === -1 && v === 0) return 4;
  if (h === 1 && v === 1) return 9;
  if (h === -1 && v === 1) return 7;
  if (h === 1 && v === -1) return 3;
  return 1; // h === -1 && v === -1
}

const PATTERNS: Record<Exclude<MotionName, '360'>, { seq: number[]; window: number }> = {
  qcf: { seq: [2, 3, 6], window: 12 },
  qcb: { seq: [2, 1, 4], window: 12 },
  dp: { seq: [6, 2, 3], window: 14 },
  rdp: { seq: [4, 2, 1], window: 14 },
  hcf: { seq: [4, 2, 6], window: 18 },
  hcb: { seq: [6, 2, 4], window: 18 },
  dd: { seq: [2, 5, 2], window: 16 },
  ff: { seq: [6, 5, 6], window: 12 },
  bb: { seq: [4, 5, 4], window: 12 },
};

/**
 * Look for an ordered subsequence of `seq` within the last `window` frames of
 * history (history: oldest..newest). Consecutive equal directions collapse, so
 * holding a direction for several frames still matches a single step.
 */
function matchOrdered(dirs: number[], seq: number[], window: number): boolean {
  const start = Math.max(0, dirs.length - window);
  let si = 0;
  let prev = -1;
  for (let i = start; i < dirs.length; i++) {
    const d = dirs[i];
    if (d === prev) continue;
    prev = d;
    // allow "5" (neutral) to be skipped unless the pattern explicitly wants it
    if (seq[si] !== 5 && d === 5) continue;
    if (d === seq[si]) {
      si++;
      if (si === seq.length) return true;
    } else if (seq[si] === 5 && d !== seq[si + 1]) {
      // waiting on a neutral gap; ignore non-matching held dir
      continue;
    }
  }
  return false;
}

/** 360: at least three of the four cardinals (rel 8/2/4/6) seen in last `window` frames. */
function match360(dirs: number[], window: number): boolean {
  const start = Math.max(0, dirs.length - window);
  const seen = new Set<number>();
  for (let i = start; i < dirs.length; i++) {
    const d = dirs[i];
    if (d === 8 || d === 2 || d === 4 || d === 6) seen.add(d);
  }
  // need forward+back+down and (up seen at some point in the buffer)
  return seen.has(4) && seen.has(6) && seen.has(2) && (seen.has(8) || seen.size >= 3);
}

export function detectMotion(
  history: number[],
  facing: 1 | -1,
  motion: MotionName,
): boolean {
  const dirs = history.map((b) => relDir(b, facing));
  if (motion === '360') return match360(dirs, 22);
  const p = PATTERNS[motion];
  return matchOrdered(dirs, p.seq, p.window);
}

/** Was `button` newly pressed this frame (rising edge)? */
export function pressed(cur: number, prev: number, bit: number): boolean {
  return (cur & bit) !== 0 && (prev & bit) === 0;
}

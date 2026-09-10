/**
 * Records a pseudo-random input log, replays it twice from a fresh state, and
 * asserts the final checksums are identical. Guards the lockstep contract.
 *
 *   npm run verify:determinism
 */
import { CHARACTERS, IN, checksum, createInitialState, step } from '../shared/src/index.js';

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUTTONS = [IN.LP, IN.HP, IN.LK, IN.HK, IN.S1, IN.S2];
const DIRS = [0, IN.LEFT, IN.RIGHT, IN.DOWN, IN.UP, IN.DOWN | IN.LEFT, IN.DOWN | IN.RIGHT];

function makeLog(seed: number, frames: number): [number, number][] {
  const r = mulberry(seed);
  const log: [number, number][] = [];
  let a = 0;
  let b = 0;
  for (let i = 0; i < frames; i++) {
    if (r() < 0.15) a = DIRS[Math.floor(r() * DIRS.length)];
    if (r() < 0.12) a = (a & DIRS.reduce((x, y) => x | y, 0)) | BUTTONS[Math.floor(r() * BUTTONS.length)];
    else a &= ~BUTTONS.reduce((x, y) => x | y, 0);
    if (r() < 0.15) b = DIRS[Math.floor(r() * DIRS.length)];
    if (r() < 0.12) b = (b & DIRS.reduce((x, y) => x | y, 0)) | BUTTONS[Math.floor(r() * BUTTONS.length)];
    else b &= ~BUTTONS.reduce((x, y) => x | y, 0);
    log.push([a, b]);
  }
  return log;
}

function replay(p1: string, p2: string, seed: string, log: [number, number][]): number {
  let s = createInitialState({ p1, p2, seed });
  for (const inp of log) s = step(s, inp);
  return checksum(s);
}

let failures = 0;
let checks = 0;
for (let k = 0; k < 12; k++) {
  const p1 = CHARACTERS[k % CHARACTERS.length].id;
  const p2 = CHARACTERS[(k + 3) % CHARACTERS.length].id;
  const seedStr = `verify-${k}`;
  const log = makeLog(k * 9973 + 1, 2400);
  const a = replay(p1, p2, seedStr, log);
  const b = replay(p1, p2, seedStr, log);
  checks++;
  const ok = a === b;
  if (!ok) failures++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${p1.padEnd(8)} vs ${p2.padEnd(8)}  seed=${seedStr}  ${a
      .toString(16)
      .padStart(8, '0')} / ${b.toString(16).padStart(8, '0')}`,
  );
}

console.log(`\n${checks - failures}/${checks} deterministic`);
process.exit(failures === 0 ? 0 : 1);

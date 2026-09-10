/**
 * Deterministic PRNG (mulberry32). The state is a single uint32 kept inside
 * SimState so replays and both netplay peers stay identical.
 */
export function rngNext(state: number): { state: number; value: number } {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: next, value };
}

/** Returns integer in [0, max). Mutates nothing; returns new rng state. */
export function rngInt(state: number, max: number): { state: number; value: number } {
  const r = rngNext(state);
  return { state: r.state, value: Math.floor(r.value * max) };
}

/** Seed a 32-bit state from an arbitrary string (netplay match seed). */
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

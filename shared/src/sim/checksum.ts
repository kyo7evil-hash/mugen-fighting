import type { FighterState, SimState } from './types.js';

/** FNV-1a-ish rolling 32-bit hash over the gameplay-relevant fields of SimState. */
export function checksum(s: SimState): number {
  let h = 2166136261 >>> 0;
  const mix = (n: number): void => {
    h ^= n | 0;
    h = Math.imul(h, 16777619) >>> 0;
  };
  const mixStr = (str: string): void => {
    for (let i = 0; i < str.length; i++) mix(str.charCodeAt(i));
  };

  mix(s.frame);
  mix(s.rngState);
  mixStr(s.phase);
  mix(s.phaseFrame);
  mix(s.roundTimer);
  mix(s.roundWinner);
  mix(s.wins[0]);
  mix(s.wins[1]);
  mix(s.roundNumber);
  mix(s.cameraX);
  mix(s.nextEntityId);

  for (const f of s.fighters) mixFighter(mix, mixStr, f);

  mix(s.projectiles.length);
  for (const p of s.projectiles) {
    mix(p.id);
    mix(p.owner);
    mix(p.x);
    mix(p.y);
    mix(p.vx);
    mix(p.vy);
    mix(p.life);
    mix(p.hitsLeft);
    mix(p.facing);
    for (const t of p.hitTargets) mix(t + 1);
  }
  return h >>> 0;
}

function mixFighter(
  mix: (n: number) => void,
  mixStr: (s: string) => void,
  f: FighterState,
): void {
  mixStr(f.charId);
  mix(f.x);
  mix(f.y);
  mix(f.vx);
  mix(f.vy);
  mix(f.facing);
  mix(f.onGround ? 1 : 0);
  mix(f.crouching ? 1 : 0);
  mix(f.health);
  mix(f.meter);
  mixStr(f.state);
  mix(f.stateFrame);
  mixStr(f.moveId ?? '-');
  mix(f.moveFrame);
  mix(f.moveConnected);
  mix(f.hitstun);
  mix(f.blockstun);
  mix(f.hitstop);
  mix(f.comboCount);
  mix(f.comboHitsDealt);
  mix(f.jumpsUsed);
  mix(f.airActionsUsed);
  mix(f.chargeDb);
  mix(f.chargeBf);
  mix(f.chargeUd);
  mix(f.armorHitsLeft);
  mix(f.invulnUntil);
  mixStr(f.stance);
  mix(f.wakeupTimer);
  mix(f.throwPartner);
  mix(f.throwReleaseTimer);
  mix(f.landing);
  mix(f.dizzy);
  mix(f.projCount);
  for (const hid of f.appliedHits) mix(hid);
  mix(f.puppet.active ? 1 : 0);
  mix(f.puppet.x);
  mix(f.puppet.y);
}

export function checksumHex(s: SimState): string {
  return checksum(s).toString(16).padStart(8, '0');
}

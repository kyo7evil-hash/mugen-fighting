import { getMove, type FighterState, type Move } from '@mugen/shared';
import type { SpriteAtlas } from '../core/assets.js';

function attackClip(id: string, m: Move, f: FighterState): string {
  if (m.hits.some((h) => h.grab)) return 'grab';
  if (m.puppet === 'summon' || m.puppet === 'recall') return 'proj';
  const rx = (re: RegExp): boolean => re.test(id);
  if (rx(/shoryu|upper|updraft|rising|swat|skyfall|pound/)) return 'uppercut';
  if (rx(/tatsu|spin|cyclone|lariat|storm|tempest|overdrive|barrage|collapse|flurry|unity|verdict|eclipse|shinku/))
    return 'spin';
  if ((m.airOk && !f.onGround && rx(/dive|stoop|meteor/)) || rx(/divekick/)) return 'divekick';
  if (m.type === 'super') return 'super';
  if (m.spawns && m.spawns.length) return 'proj';
  const btn = m.trigger.button;
  const low = m.hits.some((h) => h.low) || f.crouching;
  if (btn === 'LK' || btn === 'HK') return low ? 'kickLow' : 'kick';
  return low ? 'punchLow' : 'punch';
}

export function resolveAnim(
  f: FighterState,
  atlas: SpriteAtlas,
): { clip: string; frame: number } {
  const clips = atlas.clips;
  const has = (n: string): boolean => !!clips[n];
  let clip = 'idle';

  switch (f.state) {
    case 'intro':
      clip = 'intro';
      break;
    case 'idle':
      clip = 'idle';
      break;
    case 'walk':
      clip = 'walk';
      break;
    case 'backwalk':
      clip = 'backwalk';
      break;
    case 'crouch':
    case 'jumpsquat':
    case 'stancechange':
      clip = 'crouch';
      break;
    case 'air':
    case 'airdash':
      clip = f.vy > 0 ? 'jump' : 'fall';
      break;
    case 'dash':
      clip = 'dash';
      break;
    case 'backdash':
      clip = 'backdash';
      break;
    case 'blockstand':
    case 'blockair':
      clip = 'block';
      break;
    case 'blockcrouch':
      clip = 'blockcrouch';
      break;
    case 'blockstun':
      clip = f.crouching ? 'blockcrouch' : 'block';
      break;
    case 'hitstun':
      clip = 'hit';
      break;
    case 'airhitstun':
    case 'thrown':
      clip = 'airhit';
      break;
    case 'knockdown':
      clip = 'knockdown';
      break;
    case 'ko':
      clip = 'ko';
      break;
    case 'win':
      clip = 'win';
      break;
    case 'attack': {
      const m = f.moveId ? getMove(f.charId, f.moveId) : null;
      clip = m ? attackClip(m.id, m, f) : 'punch';
      break;
    }
  }
  if (!has(clip)) clip = 'idle';

  const meta = clips[clip];
  let frame = 0;
  if (f.state === 'attack' && f.moveId) {
    const m = getMove(f.charId, f.moveId);
    const dur = m ? m.duration : 24;
    frame = Math.min(meta.frames - 1, Math.floor((f.moveFrame / Math.max(1, dur)) * meta.frames));
  } else if (meta.loop) {
    frame = Math.floor((f.stateFrame * meta.fps) / 60) % meta.frames;
  } else {
    frame = Math.min(meta.frames - 1, Math.floor((f.stateFrame * meta.fps) / 60));
  }
  return { clip, frame: Math.max(0, frame) };
}

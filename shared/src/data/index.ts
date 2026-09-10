import { registerCharacter } from './registry.js';
import { kaito } from './characters/kaito.js';
import { bruno } from './characters/bruno.js';
import { vesper } from './characters/vesper.js';
import { rieko } from './characters/rieko.js';
import { grigor } from './characters/grigor.js';
import { anira } from './characters/anira.js';
import { tomas } from './characters/tomas.js';
import { nadia } from './characters/nadia.js';
import { sable } from './characters/sable.js';
import { goliath } from './characters/goliath.js';
import type { CharacterDef } from './types.js';

/** Canonical roster order (select screen + arcade ladder pool). */
export const CHARACTERS: CharacterDef[] = [
  kaito,
  bruno,
  vesper,
  rieko,
  grigor,
  anira,
  tomas,
  nadia,
  sable,
  goliath,
];

export const ROSTER_IDS = CHARACTERS.map((c) => c.id);
export const BOSS_ID = 'goliath';

let registered = false;
export function ensureRegistered(): void {
  if (registered) return;
  for (const c of CHARACTERS) registerCharacter(c);
  registered = true;
}
ensureRegistered();

export * from './registry.js';
export * from './types.js';
export * from './stages.js';
export { CHARACTERS as default };

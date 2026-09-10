import type { Move } from '../sim/types.js';
import type { CharacterDef } from './types.js';

const REGISTRY = new Map<string, CharacterDef>();
const MOVE_INDEX = new Map<string, Map<string, Move>>();

export function registerCharacter(def: CharacterDef): void {
  REGISTRY.set(def.id, def);
  const idx = new Map<string, Move>();
  for (const m of def.moves) idx.set(m.id, m);
  MOVE_INDEX.set(def.id, idx);
}

export function getCharacter(id: string): CharacterDef {
  const def = REGISTRY.get(id);
  if (!def) throw new Error(`Unknown character: ${id}`);
  return def;
}

export function tryGetCharacter(id: string): CharacterDef | undefined {
  return REGISTRY.get(id);
}

export function getMove(charId: string, moveId: string): Move | undefined {
  return MOVE_INDEX.get(charId)?.get(moveId);
}

export function allCharacters(): CharacterDef[] {
  return [...REGISTRY.values()];
}

export function characterIds(): string[] {
  return [...REGISTRY.keys()];
}

export function isRegistered(id: string): boolean {
  return REGISTRY.has(id);
}

import type { Move } from '../sim/types.js';

/** Colours used by the procedural sprite generator + UI accents. */
export interface PaletteSpec {
  skin: string;
  hair: string;
  primary: string; // main outfit
  secondary: string; // trim / gloves / boots
  accent: string; // belt, energy, fx
  outline: string;
}

/** Blocky-humanoid proportions for the sprite generator (in sprite pixels). */
export interface BuildSpec {
  height: number; // total px, ~46
  headR: number;
  shoulder: number; // half-width of torso top
  hip: number; // half-width of torso bottom
  limb: number; // limb thickness
  bulk: number; // 0..3 extra torso mass
  style: 'gi' | 'hoodie' | 'coat' | 'armor' | 'ninja' | 'boxer' | 'robe' | 'bruiser';
}

export interface CharStats {
  maxHealth: number;
  walkFwd: number;
  walkBack: number;
  dashFwd: number;
  dashBack: number;
  dashFwdFrames: number;
  backdashFrames: number;
  backdashInvuln: number;
  jumpVy: number;
  gravity: number;
  airMoveX: number;
  jumps: number;
  airdash: 'none' | 'forward' | 'free';
  prejump: number;
  weight: number; // 100 = normal; higher = less knockback
  fastfall?: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  archetype: string;
  bio: string;
  quote: string;
  stats: CharStats;
  palette: PaletteSpec;
  build: BuildSpec;
  moves: Move[];
  /** Normal-chain routes: fromMoveId -> [allowed next move ids]. */
  chains: Record<string, string[]>;
  /** Reference combos for the CPU (sequences of move ids). */
  combos: string[][];
  /** Synth voice params (frequencies in Hz). */
  voice: { hit: number; ko: number; special: number };
  fullyTuned: boolean;
  /** Home stage id. */
  stage: string;
}

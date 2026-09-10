import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS } from '../shared/src/data/index.js';
import { CLIPS, CLIP_NAMES, MAX_FRAMES } from './clips.js';
import { drawFigure, type Build, type Palette } from './figure.js';
import { encodePNG, Pix, shade } from './png.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'frontend/public/assets/characters');

const CELL = 64;
const ORIGIN_X = 28;
const GROUND_Y = 60;

interface AtlasClip {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

function genCharacter(id: string, name: string, build: Build, pal: Palette): void {
  const sheet = new Pix(CELL * MAX_FRAMES, CELL * CLIP_NAMES.length);
  const clips: Record<string, AtlasClip> = {};

  CLIP_NAMES.forEach((clipName, row) => {
    const clip = CLIPS[clipName];
    clips[clipName] = { row, frames: clip.poses.length, fps: clip.fps, loop: clip.loop };
    clip.poses.forEach((pose, col) => {
      const cell = new Pix(CELL, CELL);
      // subtle contact shadow
      for (let x = -10; x <= 10; x++) {
        const a = Math.max(0, 60 - Math.abs(x) * 5);
        cell.hex(ORIGIN_X + x, GROUND_Y + 1, '#000000', a);
      }
      drawFigure(cell, ORIGIN_X, GROUND_Y, build, pal, pose);
      sheet.blit(cell, col * CELL, row * CELL);
    });
  });

  // portrait: big bust
  const portrait = new Pix(96, 96);
  portrait.rect(0, 0, 96, 96, shade(pal.primary, -40));
  portrait.rect(0, 0, 96, 96, pal.primary, 40);
  drawPortrait(portrait, build, pal);

  const dir = resolve(OUT, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'sheet.png'), encodePNG(sheet.w, sheet.h, sheet.data));
  writeFileSync(resolve(dir, 'portrait.png'), encodePNG(portrait.w, portrait.h, portrait.data));
  writeFileSync(
    resolve(dir, 'atlas.json'),
    JSON.stringify({ id, name, cell: CELL, originX: ORIGIN_X, groundY: GROUND_Y, clips }, null, 1),
  );
  process.stdout.write(`  sprites: ${id}\n`);
}

function drawPortrait(pix: Pix, b: Build, pal: Palette): void {
  const cx = 48;
  const headR = b.headR * 3.2;
  const neckY = 78;
  // shoulders
  for (let y = 0; y < 24; y++) {
    const w = 20 + y * 1.4 + b.bulk * 3;
    pix.rect(cx - w, neckY - 6 + y, w * 2, 2, y < 10 ? pal.primary : pal.secondary);
    pix.rect(cx - w, neckY - 6 + y, 2, 2, pal.outline);
    pix.rect(cx + w - 2, neckY - 6 + y, 2, 2, pal.outline);
  }
  // neck
  pix.rect(cx - 7, neckY - 20, 14, 20, pal.skin);
  // head
  pix.disc(cx, neckY - 24, headR + 2, pal.outline);
  pix.disc(cx, neckY - 24, headR, pal.skin);
  // hair
  for (let a = -headR; a <= headR; a++)
    for (let d = -headR; d <= 2; d++)
      if (a * a + d * d <= headR * headR) pix.hex(cx + a, neckY - 24 + d - 2, pal.hair);
  // eyes
  pix.rect(cx - 8, neckY - 26, 4, 3, pal.outline);
  pix.rect(cx + 5, neckY - 26, 4, 3, pal.outline);
  // accent scarf
  pix.rect(cx - 16, neckY - 4, 32, 4, pal.accent);
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  process.stdout.write('generating character sprites...\n');
  for (const c of CHARACTERS) {
    genCharacter(c.id, c.name, c.build as Build, c.palette as Palette);
  }
  writeFileSync(
    resolve(OUT, '..', 'roster.json'),
    JSON.stringify(
      {
        clipNames: CLIP_NAMES,
        characters: CHARACTERS.map((c) => ({
          id: c.id,
          name: c.name,
          archetype: c.archetype,
          quote: c.quote,
          bio: c.bio,
          stage: c.stage,
          accent: c.palette.accent,
          primary: c.palette.primary,
          fullyTuned: c.fullyTuned,
        })),
      },
      null,
      1,
    ),
  );
  process.stdout.write('done.\n');
}

main();

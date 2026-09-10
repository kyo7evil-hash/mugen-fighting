import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGES, type StageDef } from '../shared/src/data/stages.js';
import { encodePNG, parseHex, Pix, shade } from './png.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'client/public/assets/stages');

const SKY_W = 480;
const SKY_H = 270;
const LAYER_W = 768;
const LAYER_H = 200;
const FLOOR_W = 960;
const FLOOR_H = 90;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), s | 1) + 0x6d2b79f5) >>> 0;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function lerpHex(a: string, b: string, t: number): [number, number, number] {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return [
    Math.round(ca[0] + (cb[0] - ca[0]) * t),
    Math.round(ca[1] + (cb[1] - ca[1]) * t),
    Math.round(ca[2] + (cb[2] - ca[2]) * t),
  ];
}

function genSky(st: StageDef): Pix {
  const p = new Pix(SKY_W, SKY_H);
  for (let y = 0; y < SKY_H; y++) {
    const t = y / SKY_H;
    const [r, g, b] = lerpHex(st.skyTop, st.skyBottom, Math.pow(t, 0.8));
    for (let x = 0; x < SKY_W; x++) p.set(x, y, r, g, b, 255);
  }
  // sun / moon disc
  const rnd = rng(seedOf(st.id) ^ 0x9e3779b9);
  const sx = 60 + Math.floor(rnd() * 360);
  const sy = 40 + Math.floor(rnd() * 80);
  p.disc(sx, sy, 22, shade(st.skyBottom, 40), 60);
  p.disc(sx, sy, 14, shade(st.accent, 30), 120);
  return p;
}

function genLayer(st: StageDef, idx: number, color: string): Pix {
  const p = new Pix(LAYER_W, LAYER_H);
  const rnd = rng(seedOf(st.id) + idx * 1013);
  const base = LAYER_H - 8;
  const density = 0.7 - idx * 0.12;
  let x = 0;
  while (x < LAYER_W) {
    const w = 24 + Math.floor(rnd() * (70 - idx * 12));
    const h = 30 + Math.floor(rnd() * (150 - idx * 30));
    if (rnd() < density) {
      const shadeAmt = -10 - idx * 6 + Math.floor(rnd() * 12);
      const c = shade(color, shadeAmt);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) p.hex(x + xx, base - yy, c);
      // silhouette top detail
      if (idx <= 1 && rnd() < 0.5) {
        p.rect(x + w / 2 - 2, base - h - 6, 4, 8, shade(color, shadeAmt - 8));
      }
      // window specks for near/mid urban feel
      if (idx >= 1 && rnd() < 0.6) {
        for (let k = 0; k < 6; k++) {
          const wx = x + 4 + Math.floor(rnd() * (w - 8));
          const wy = base - 6 - Math.floor(rnd() * (h - 10));
          p.hex(wx, wy, st.accent, 120);
        }
      }
    }
    x += w + Math.floor(rnd() * 18);
  }
  return p;
}

function genFloor(st: StageDef): Pix {
  const p = new Pix(FLOOR_W, FLOOR_H);
  for (let y = 0; y < FLOOR_H; y++) {
    const t = y / FLOOR_H;
    const [r, g, b] = lerpHex(st.floorColor, shade(st.floorColor, -30), t);
    for (let x = 0; x < FLOOR_W; x++) p.set(x, y, r, g, b, 255);
  }
  // top edge line
  p.rect(0, 0, FLOOR_W, 2, st.floorLine);
  p.rect(0, 2, FLOOR_W, 1, shade(st.floorColor, 24));
  // plank / tile seams
  const rnd = rng(seedOf(st.id) ^ 0x51ed);
  for (let x = 0; x < FLOOR_W; x += 34 + Math.floor(rnd() * 10)) {
    for (let y = 3; y < FLOOR_H; y += 2) p.hex(x, y, st.floorLine, 120);
  }
  for (let i = 0; i < 120; i++) {
    p.hex(Math.floor(rnd() * FLOOR_W), 3 + Math.floor(rnd() * (FLOOR_H - 4)), st.floorLine, 40);
  }
  return p;
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  process.stdout.write('generating stages...\n');
  const index: unknown[] = [];
  for (const st of STAGES) {
    const dir = resolve(OUT, st.id);
    mkdirSync(dir, { recursive: true });
    const sky = genSky(st);
    writeFileSync(resolve(dir, 'sky.png'), encodePNG(sky.w, sky.h, sky.data));
    const layerColors = st.layers.map((l) => l.colors[0]);
    layerColors.forEach((c, i) => {
      const lp = genLayer(st, i, c);
      writeFileSync(resolve(dir, `layer${i}.png`), encodePNG(lp.w, lp.h, lp.data));
    });
    const floor = genFloor(st);
    writeFileSync(resolve(dir, 'floor.png'), encodePNG(floor.w, floor.h, floor.data));
    writeFileSync(
      resolve(dir, 'stage.json'),
      JSON.stringify(
        {
          id: st.id,
          name: st.name,
          layerW: LAYER_W,
          layerH: LAYER_H,
          floorW: FLOOR_W,
          floorH: FLOOR_H,
          parallax: st.layers.map((l) => l.parallax),
          accent: st.accent,
          music: st.music,
        },
        null,
        1,
      ),
    );
    index.push({ id: st.id, name: st.name });
    process.stdout.write(`  stage: ${st.id}\n`);
  }
  writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index, null, 1));
  process.stdout.write('done.\n');
}

main();

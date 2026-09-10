import {
  UNIT,
  VIEW_H,
  VIEW_W,
  getCharacter,
  getMove,
  type FighterState,
  type Projectile,
  type SimState,
} from '@mugen/shared';
import type { Assets, SpriteAtlas, StageAssets } from '../core/assets.js';
import { resolveAnim } from './anim.js';

export const GROUND_SCREEN_Y = 216;

export interface Cam {
  x: number;
  shakeX: number;
  shakeY: number;
}

export function worldToScreenX(xUnits: number, camX: number): number {
  return (xUnits - camX) / UNIT + VIEW_W / 2;
}
export function worldToScreenY(yUnits: number): number {
  return GROUND_SCREEN_Y - yUnits / UNIT;
}

export function drawStage(
  ctx: CanvasRenderingContext2D,
  st: StageAssets,
  camX: number,
  shake: { x: number; y: number },
): void {
  ctx.drawImage(st.sky, 0, shake.y * 0.3, VIEW_W, VIEW_H);
  const baseY = GROUND_SCREEN_Y;
  st.layers.forEach((img, i) => {
    const par = st.meta.parallax[i] ?? 0.4;
    const w = img.width;
    let ox = (-camX / UNIT) * par + shake.x * par;
    ox = ((ox % w) + w) % w;
    const y = baseY - img.height + 2 + shake.y * par;
    for (let dx = -w; dx < VIEW_W + w; dx += w) {
      ctx.drawImage(img, Math.round(dx - ox), Math.round(y));
    }
  });
  // floor
  const f = st.floor;
  let fox = (-camX / UNIT) * 1 + shake.x;
  fox = ((fox % f.width) + f.width) % f.width;
  for (let dx = -f.width; dx < VIEW_W + f.width; dx += f.width) {
    ctx.drawImage(f, Math.round(dx - fox), Math.round(baseY + shake.y));
  }
}

function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  atlas: SpriteAtlas,
  clip: string,
  frame: number,
  sx: number,
  sy: number,
  facing: 1 | -1,
  flash: boolean,
): void {
  const meta = atlas.clips[clip] ?? atlas.clips.idle;
  const cell = atlas.cell;
  const srcX = frame * cell;
  const srcY = meta.row * cell;
  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.scale(facing, 1);
  if (flash) ctx.filter = 'brightness(2.6) saturate(0.2)';
  ctx.drawImage(sheet, srcX, srcY, cell, cell, -atlas.originX, -atlas.groundY, cell, cell);
  ctx.restore();
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  f: FighterState,
  camX: number,
): void {
  const ca = assets.char(f.charId);
  const sx = worldToScreenX(f.x, camX);
  const sy = worldToScreenY(f.y);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  const shW = f.onGround ? 20 : 12;
  ctx.beginPath();
  ctx.ellipse(sx, GROUND_SCREEN_Y - 1, shW, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // puppet
  if (f.puppet.active) {
    const px = worldToScreenX(f.puppet.x, camX);
    const py = worldToScreenY(f.puppet.y);
    ctx.globalAlpha = 0.55;
    drawSpriteFrame(ctx, ca.sheet, ca.atlas, 'idle', 0, px, py, f.puppet.facing, false);
    ctx.globalAlpha = 1;
  }

  const { clip, frame } = resolveAnim(f, ca.atlas);
  const flash = f.hitFlash > 0 && (f.hitFlash & 1) === 0 ? false : f.hitFlash > 0;
  drawSpriteFrame(ctx, ca.sheet, ca.atlas, clip, frame, sx, sy, f.facing, flash);

  if (f.blockFlash > 0) {
    ctx.strokeStyle = `rgba(150,200,255,${f.blockFlash / 8})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 14, worldToScreenY(f.y) - 46, 28, 46);
  }
}

const PROJ_COLORS: Record<string, [string, string]> = {
  kiball: ['#7fd0ff', '#ffffff'],
  kibeam: ['#9ae0ff', '#ffffff'],
  needle: ['#e8f0a0', '#ffffff'],
  snare: ['#b0f0c0', '#ffffff'],
  bolt: ['#ffd08a', '#ffffff'],
  feather: ['#ffc0e8', '#ffffff'],
  inkbolt: ['#c0a0ff', '#ffffff'],
  shadebolt: ['#a0ffe0', '#ffffff'],
  eclipse: ['#6a5aff', '#c0b0ff'],
  quakewave: ['#ffa060', '#ffe0a0'],
};

export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  p: Projectile,
  camX: number,
): void {
  const sx = worldToScreenX(p.x, camX);
  const sy = worldToScreenY(p.y);
  const [c0, c1] = PROJ_COLORS[p.kind] ?? ['#ffffff', '#ffffff'];
  const w = Math.max(6, p.box.w / UNIT);
  const h = Math.max(6, p.box.h / UNIT);
  ctx.fillStyle = c0;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(sx, sy, w * 0.7, h * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c1;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(sx, sy, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // motion streak
  ctx.strokeStyle = c0;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx - Math.sign(p.vx) * 10, sy);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawHitboxes(
  ctx: CanvasRenderingContext2D,
  s: SimState,
  camX: number,
): void {
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    facing: 1 | -1,
    ox: number,
    oy: number,
    color: string,
  ): void => {
    let lx = x;
    let lx2 = x + w;
    if (facing === -1) {
      const a = -lx2;
      lx2 = -lx;
      lx = a;
    }
    const px = worldToScreenX(ox + lx, camX);
    const py = worldToScreenY(oy + y + h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, w / UNIT, h / UNIT);
  };
  for (const f of s.fighters) {
    // hurtbox (approx via move or stance)
    const m = f.state === 'attack' && f.moveId ? getMove(f.charId, f.moveId) : null;
    const hb = m?.hurtbox ?? { x: -20 * UNIT, y: 0, w: 40 * UNIT, h: 100 * UNIT };
    rect(hb.x, hb.y, hb.w, hb.h, f.facing, f.x, f.y, 'rgba(90,160,255,0.7)');
    if (m) {
      for (const h of m.hits) {
        if (f.moveFrame < h.from || f.moveFrame > h.to) continue;
        rect(h.box.x, h.box.y, h.box.w, h.box.h, f.facing, f.x, f.y, 'rgba(255,70,70,0.9)');
      }
    }
  }
  for (const p of s.projectiles) {
    rect(p.box.x, p.box.y, p.box.w, p.box.h, p.facing, p.x, p.y, 'rgba(255,140,60,0.9)');
  }
}

export function drawSparks(ctx: CanvasRenderingContext2D, s: SimState, camX: number): void {
  for (const sp of s.hitSparks) {
    const x = worldToScreenX(sp.x, camX);
    const y = worldToScreenY(sp.y);
    const t = sp.life / 12;
    const r = (sp.big ? 12 : 7) * (1.2 - t * 0.6);
    if (sp.kind === 'block') {
      ctx.strokeStyle = `rgba(150,200,255,${t})`;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + sp.life;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.stroke();
      }
      continue;
    }
    const col =
      sp.kind === 'counter'
        ? `rgba(255,220,120,${t})`
        : sp.kind === 'clash'
          ? `rgba(200,200,255,${t})`
          : `rgba(255,240,200,${t})`;
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + sp.life * 0.6;
      const rr = r * (0.6 + (i % 2) * 0.6);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(255,255,255,${t})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function computeShake(s: SimState): { x: number; y: number } {
  const m = s.screenShake;
  if (m <= 0) return { x: 0, y: 0 };
  const seed = s.frame * 2654435761;
  const rx = ((seed & 0xff) / 255 - 0.5) * m;
  const ry = (((seed >> 8) & 0xff) / 255 - 0.5) * m;
  return { x: rx, y: ry };
}

export { getCharacter };

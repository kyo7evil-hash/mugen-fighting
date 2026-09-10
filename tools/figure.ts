import { Pix, shade } from './png.js';

export interface Build {
  height: number;
  headR: number;
  shoulder: number;
  hip: number;
  limb: number;
  bulk: number;
  style: string;
}

export interface Palette {
  skin: string;
  hair: string;
  primary: string;
  secondary: string;
  accent: string;
  outline: string;
}

export interface Pose {
  lean?: number;
  bob?: number;
  crouch?: number; // 0..1
  /** hand target offset from shoulder, sprite faces +x (right). */
  armF?: [number, number];
  armB?: [number, number];
  /** foot target offset from pelvis. */
  legF?: [number, number];
  legB?: [number, number];
  fx?: 'proj' | 'energy' | 'trail' | 'none';
  headTilt?: number;
}

const DEFAULT_POSE: Required<Pose> = {
  lean: 0,
  bob: 0,
  crouch: 0,
  armF: [4, 8],
  armB: [-3, 9],
  legF: [4, 18],
  legB: [-4, 18],
  fx: 'none',
  headTilt: 0,
};

export function drawFigure(
  pix: Pix,
  cx: number,
  groundY: number,
  b: Build,
  pal: Palette,
  poseIn: Pose,
): void {
  const p = { ...DEFAULT_POSE, ...poseIn };
  const legLen = b.height * 0.46;
  const torsoLen = b.height * 0.32;
  const crouchDrop = p.crouch * legLen * 0.5;
  const hipH = groundY - (legLen - crouchDrop);
  const hipX = cx + p.lean * 0.5;
  const neckX = hipX + p.lean;
  const neckY = hipH - torsoLen + p.bob;
  const headR = b.headR;
  const headX = neckX + p.headTilt;
  const headY = neckY - headR - 1;

  const outline = pal.outline;
  const skin = pal.skin;
  const prim = pal.primary;
  const sec = pal.secondary;
  const lw = b.limb;

  // back leg
  foot(pix, hipX, hipH, hipX + p.legB[0], groundY - Math.max(0, 18 - p.legB[1] + p.legB[1]) + (p.legB[1] - 18), p.legB, lw, shade(prim, -26), outline, groundY);
  // back arm
  const shBx = neckX - b.shoulder * 0.5;
  arm(pix, shBx, neckY + 2, p.armB, lw, shade(skin, -18), outline);

  // torso
  torso(pix, hipX, hipH, neckX, neckY, b, pal);

  // front leg
  foot(pix, hipX, hipH, hipX + p.legF[0], groundY + (p.legF[1] - 18), p.legF, lw, prim, outline, groundY);

  // head
  pix.disc(headX, headY, headR + 1, outline);
  pix.disc(headX, headY, headR, skin);
  // hair cap
  for (let a = -headR; a <= headR; a++)
    for (let d = -headR; d <= 0; d++)
      if (a * a + d * d <= headR * headR) pix.hex(headX + a, headY + d - 1, pal.hair);
  pix.rect(headX - headR, headY - headR - 1, headR * 2 + 1, 2, pal.hair);
  // eye hint (facing +x)
  pix.hex(headX + Math.max(1, headR - 2), headY - 1, outline);

  // front arm (drawn last, on top)
  const shFx = neckX + b.shoulder * 0.5;
  arm(pix, shFx, neckY + 2, p.armF, lw, skin, outline);

  // fx
  if (p.fx === 'proj') {
    const hx = shFx + p.armF[0];
    const hy = neckY + 2 + p.armF[1];
    pix.disc(hx + 3, hy, 3, pal.accent);
    pix.disc(hx + 3, hy, 2, '#ffffff');
  } else if (p.fx === 'energy') {
    const hx = shFx + p.armF[0];
    const hy = neckY + 2 + p.armF[1];
    pix.disc(hx, hy, 4, pal.accent);
    pix.disc(hx, hy, 2, '#ffffff');
  } else if (p.fx === 'trail') {
    pix.limb(hipX - p.lean, hipH, hipX - p.lean - 8, hipH + 2, 2, pal.accent);
  }
}

function torso(
  pix: Pix,
  hipX: number,
  hipH: number,
  neckX: number,
  neckY: number,
  b: Build,
  pal: Palette,
): void {
  const topW = b.shoulder + b.bulk;
  const botW = b.hip + b.bulk * 0.6;
  const steps = Math.max(2, Math.round(hipH - neckY));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = neckY + (hipH - neckY) * t;
    const x = neckX + (hipX - neckX) * t;
    const w = topW + (botW - topW) * t;
    pix.rect(x - w - 1, y, w * 2 + 2, 2, pal.outline);
    pix.rect(x - w, y, w * 2, 2, t < 0.45 ? pal.primary : pal.secondary);
    // accent belt
    if (Math.abs(t - 0.62) < 0.06) pix.rect(x - w, y, w * 2, 2, pal.accent);
  }
}

function arm(
  pix: Pix,
  sx: number,
  sy: number,
  target: [number, number],
  w: number,
  color: string,
  outline: string,
): void {
  const hx = sx + target[0];
  const hy = sy + target[1];
  const ex = (sx + hx) / 2 + (hy - sy) * 0.12;
  const ey = (sy + hy) / 2;
  const t = Math.max(1, w - 1);
  pix.limb(sx, sy, ex, ey, t, outline);
  pix.limb(ex, ey, hx, hy, t, outline);
  pix.limb(sx, sy, ex, ey, Math.max(1, t - 1), color);
  pix.limb(ex, ey, hx, hy, Math.max(1, t - 1), color);
  pix.disc(hx, hy, Math.max(1, t - 1), color);
}

function foot(
  pix: Pix,
  px_: number,
  py: number,
  fx: number,
  fy: number,
  _target: [number, number],
  w: number,
  color: string,
  outline: string,
  groundY: number,
): void {
  const kx = (px_ + fx) / 2 + 1;
  const ky = (py + fy) / 2;
  const t = Math.max(1, w - 1);
  pix.limb(px_, py, kx, ky, t, outline);
  pix.limb(kx, ky, fx, fy, t, outline);
  pix.limb(px_, py, kx, ky, Math.max(1, t - 1), color);
  pix.limb(kx, ky, fx, fy, Math.max(1, t - 1), color);
  // shoe
  pix.rect(fx - t, Math.min(groundY - 1, fy) - 1, t * 2 + 2, 2, outline);
}

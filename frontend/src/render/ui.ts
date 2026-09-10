import { VIEW_W } from '@mugen/shared';

export interface TextOpts {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  shadow?: string | null;
  weight?: 'normal' | 'bold';
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  o: TextOpts = {},
): void {
  const size = o.size ?? 10;
  ctx.font = `${o.weight === 'bold' ? 'bold ' : ''}${size}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  if (o.shadow !== null) {
    ctx.fillStyle = o.shadow ?? '#000';
    ctx.fillText(str, x + 1, y + 1);
  }
  ctx.fillStyle = o.color ?? '#e8e8f0';
  ctx.fillText(str, x, y);
}

export function centerText(
  ctx: CanvasRenderingContext2D,
  str: string,
  y: number,
  o: TextOpts = {},
): void {
  text(ctx, str, VIEW_W / 2, y, { ...o, align: 'center' });
}

export function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = 'rgba(8,10,18,0.82)',
  border = '#3a3f55',
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
  bg = '#1a1c26',
): void {
  frac = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * frac), h);
}

/** vertical gradient fill helper. */
export function vgrad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  top: string,
  bottom: string,
): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.06): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
}

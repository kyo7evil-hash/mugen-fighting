import {
  METER_MAX,
  METER_PER_STOCK,
  ROUNDS_TO_WIN,
  VIEW_W,
  getCharacter,
  type SimState,
} from '@mugen/shared';
import { text } from './ui.js';

interface HudExtra {
  names: [string, string];
  /** lagging "chip" health for the drain effect. */
  ghost: [number, number];
  roundsToWin?: number;
}

export function drawHud(ctx: CanvasRenderingContext2D, s: SimState, extra: HudExtra): void {
  const [a, b] = s.fighters;
  const rtw = extra.roundsToWin ?? ROUNDS_TO_WIN;

  drawSide(ctx, 6, a.health / a.maxHealth, extra.ghost[0] / a.maxHealth, a.meter / METER_MAX, extra.names[0], false, s.wins[0], rtw, getCharacter(a.charId).palette.accent);
  drawSide(ctx, VIEW_W - 6, b.health / b.maxHealth, extra.ghost[1] / b.maxHealth, b.meter / METER_MAX, extra.names[1], true, s.wins[1], rtw, getCharacter(b.charId).palette.accent);

  // timer
  const secs = Math.ceil(s.roundTimer / 60);
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(VIEW_W / 2 - 15, 6, 30, 16);
  ctx.strokeStyle = '#3a3f55';
  ctx.strokeRect(VIEW_W / 2 - 15 + 0.5, 6.5, 29, 15);
  text(ctx, String(Math.max(0, secs)).padStart(2, '0'), VIEW_W / 2, 18, {
    align: 'center',
    size: 12,
    color: secs <= 10 ? '#ff6a6a' : '#e8e8f0',
    weight: 'bold',
  });

  // combo counter
  drawCombo(ctx, s, 0, 40);
  drawCombo(ctx, s, 1, VIEW_W - 40);
}

function drawSide(
  ctx: CanvasRenderingContext2D,
  edgeX: number,
  hp: number,
  ghost: number,
  meter: number,
  name: string,
  mirror: boolean,
  wins: number,
  roundsToWin: number,
  accent: string,
): void {
  const w = 190;
  const h = 12;
  const x = mirror ? edgeX - w : edgeX;
  const dir = mirror ? -1 : 1;
  const fillX = mirror ? edgeX - w : edgeX;

  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(x - 1, 5, w + 2, h + 2);
  // ghost (chip)
  ctx.fillStyle = '#7a2a2a';
  const gw = Math.max(0, Math.min(1, ghost)) * w;
  ctx.fillRect(mirror ? edgeX - gw : fillX, 6, gw, h);
  // health
  ctx.fillStyle = hp > 0.3 ? '#ffd23b' : '#ff5a3b';
  const hw = Math.max(0, Math.min(1, hp)) * w;
  ctx.fillRect(mirror ? edgeX - hw : fillX, 6, hw, h);
  ctx.strokeStyle = '#3a3f55';
  ctx.strokeRect(x - 0.5, 5.5, w + 1, h + 1);

  // meter
  const my = 20;
  const mw = w * 0.62;
  const mx = mirror ? edgeX - mw : edgeX;
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(mx - 1, my, mw + 2, 5);
  ctx.fillStyle = accent;
  ctx.fillRect(mirror ? edgeX - Math.min(1, meter) * mw : mx, my, Math.min(1, meter) * mw, 5);
  // stock ticks
  ctx.strokeStyle = '#0a0c14';
  for (let k = 1; k < Math.ceil(METER_MAX / METER_PER_STOCK); k++) {
    const fx = mirror ? edgeX - (k / (METER_MAX / METER_PER_STOCK)) * mw : mx + (k / (METER_MAX / METER_PER_STOCK)) * mw;
    ctx.beginPath();
    ctx.moveTo(fx, my);
    ctx.lineTo(fx, my + 5);
    ctx.stroke();
  }

  // name
  text(ctx, name.toUpperCase(), mirror ? edgeX : edgeX, 34, {
    align: mirror ? 'right' : 'left',
    size: 9,
    color: '#c8c8d8',
  });

  // round pips
  for (let k = 0; k < roundsToWin; k++) {
    const px = mirror ? edgeX - 4 - k * 8 : edgeX + 4 + k * 8;
    ctx.fillStyle = k < wins ? accent : '#33374a';
    ctx.beginPath();
    ctx.arc(px, 40, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  void dir;
}

function drawCombo(ctx: CanvasRenderingContext2D, s: SimState, attacker: 0 | 1, x: number): void {
  const victim = s.fighters[(1 - attacker) as 0 | 1];
  const c = victim.comboCount;
  if (c < 2) return;
  const align: CanvasTextAlign = attacker === 0 ? 'left' : 'right';
  text(ctx, `${c} HITS`, x, 60, { align, size: 13, color: '#ffcf5a', weight: 'bold' });
}

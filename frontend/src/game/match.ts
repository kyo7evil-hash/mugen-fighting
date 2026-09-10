import {
  UNIT,
  VIEW_W,
  createInitialState,
  getCharacter,
  step,
  type SimState,
} from '@mugen/shared';
import type { App } from '../core/app.js';
import { CpuBrain } from '../ai/cpu.js';
import { drawHud } from '../render/hud.js';
import { centerText, scanlines, text } from '../render/ui.js';
import {
  WORLD_SCALE,
  computeShake,
  drawFighter,
  drawHitboxes,
  drawProjectile,
  drawSparks,
  drawStage,
} from '../render/world.js';

export type Controller =
  | { kind: 'local'; player: 0 | 1 }
  | { kind: 'cpu'; difficulty: 0 | 1 | 2 };

export interface MatchOpts {
  p1: string;
  p2: string;
  stageId: string;
  seed: string | number;
  controllers: [Controller, Controller];
  training?: boolean;
  roundsToWin?: number;
  roundTime?: number;
  hideHud?: boolean;
}

export class MatchRunner {
  state: SimState;
  private opts: MatchOpts;
  private brains: (CpuBrain | null)[] = [null, null];
  private ghost: [number, number];
  private camX = 0;
  private lastHitFrameBy: [number, number] = [-99, -99];
  over = false;
  matchWinner: -1 | 0 | 1 = -1;
  banner = '';
  bannerTimer = 0;
  /** external input override (netplay). Return null to stall this frame. */
  provideInputs: (() => [number, number] | null) | null = null;
  onEvent: ((tag: string) => void) | null = null;

  constructor(app: App, opts: MatchOpts) {
    this.opts = opts;
    this.state = createInitialState({
      p1: opts.p1,
      p2: opts.p2,
      seed: opts.seed,
      training: opts.training,
      roundsToWin: opts.roundsToWin ?? app.settings.roundsToWin,
      roundTime: opts.roundTime ?? app.settings.roundTime,
    });
    this.ghost = [this.state.fighters[0].health, this.state.fighters[1].health];
    opts.controllers.forEach((c, i) => {
      if (c.kind === 'cpu') this.brains[i] = new CpuBrain(i as 0 | 1, c.difficulty, hashSeed(opts.seed) + i);
    });
  }

  private localBits(app: App, i: 0 | 1): number {
    const c = this.opts.controllers[i];
    if (c.kind === 'local') return app.input.player(c.player);
    if (c.kind === 'cpu') {
      const brain = this.brains[i]!;
      const hit = this.state.events.some((e) => e.t === 'hit' && e.attacker === i);
      return brain.think(this.state, hit);
    }
    return 0;
  }

  tick(app: App): void {
    if (this.bannerTimer > 0) this.bannerTimer--;

    let inputs: [number, number] | null;
    if (this.provideInputs) inputs = this.provideInputs();
    else inputs = [this.localBits(app, 0), this.localBits(app, 1)];
    if (!inputs) return; // netplay stall

    const prevPhase = this.state.phase;
    this.state = step(this.state, inputs);
    this.processEvents(app, prevPhase);

    // ghost health drain
    for (let i = 0; i < 2; i++) {
      const hp = this.state.fighters[i].health;
      if (this.ghost[i] > hp) this.ghost[i] = Math.max(hp, this.ghost[i] - 3);
      else this.ghost[i] = hp;
    }
  }

  private processEvents(app: App, prevPhase: string): void {
    for (const e of this.state.events) {
      switch (e.t) {
        case 'hit':
          app.audio.sfx(e.counter ? 'hitheavy' : e.damage >= 60 ? 'hitheavy' : 'hit');
          this.lastHitFrameBy[e.attacker] = this.state.frame;
          if (e.counter) {
            this.banner = 'COUNTER';
            this.bannerTimer = 40;
          }
          break;
        case 'block':
          app.audio.sfx('block');
          break;
        case 'throw':
          app.audio.sfx('throw');
          break;
        case 'super':
          app.audio.sfx('super');
          this.banner = `${getCharacter(this.state.fighters[e.attacker].charId).name.toUpperCase()} SUPER`;
          this.bannerTimer = 44;
          break;
        case 'projectile':
          app.audio.sfx('special');
          break;
        case 'roundstart':
          app.audio.sfx('round');
          this.banner = this.state.roundNumber >= 3 ? 'FINAL ROUND' : `ROUND ${this.state.roundNumber}`;
          this.bannerTimer = 70;
          break;
        case 'ko':
          app.audio.sfx('ko');
          this.banner = 'K.O.';
          this.bannerTimer = 120;
          break;
        case 'roundend':
          if (this.banner !== 'K.O.') {
            this.banner = 'TIME';
            this.bannerTimer = 100;
          }
          break;
        case 'matchend':
          this.over = true;
          this.matchWinner = e.winner;
          break;
      }
      this.onEvent?.(e.t);
    }
    if (prevPhase !== 'matchend' && this.state.phase === 'matchend' && !this.over) {
      this.over = true;
      this.matchWinner = this.state.wins[0] > this.state.wins[1] ? 0 : 1;
    }
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const st = app.assets.stage(this.opts.stageId);
    const shake = computeShake(s);
    // Zoom-aware camera: follow the fighters' midpoint, clamped so the view edge
    // (narrowed by WORLD_SCALE) never passes the stage wall.
    const mid = (s.fighters[0].x + s.fighters[1].x) / 2;
    const lim = s.config.stageHalfWidth - (VIEW_W / 2 / WORLD_SCALE) * UNIT;
    const target = Math.max(-lim, Math.min(lim, mid));
    this.camX += (target - this.camX) / 6;

    drawStage(ctx, st, this.camX, shake);

    const ordered = [...s.projectiles];
    for (const p of ordered) drawProjectile(ctx, p, this.camX);

    // draw fighters back-to-front by x
    const fs = [s.fighters[0], s.fighters[1]].sort((a, b) => a.y - b.y || b.x - a.x);
    for (const f of fs) drawFighter(ctx, app.assets, f, this.camX);

    drawSparks(ctx, s, this.camX);
    if (app.settings.showHitboxes || this.opts.training) drawHitboxes(ctx, s, this.camX);

    if (!this.opts.hideHud) {
      drawHud(ctx, s, {
        names: [getCharacter(s.fighters[0].charId).name, getCharacter(s.fighters[1].charId).name],
        ghost: this.ghost,
        roundsToWin: this.opts.roundsToWin ?? app.settings.roundsToWin,
      });
    }

    if (s.koSlowmo > 0) {
      ctx.fillStyle = `rgba(255,255,255,${s.koSlowmo / 90})`;
      ctx.fillRect(0, 0, 480, 270);
    }

    if (this.bannerTimer > 0 && this.banner) {
      const a = Math.min(1, this.bannerTimer / 20);
      ctx.globalAlpha = a;
      centerText(ctx, this.banner, 130, {
        size: this.banner === 'K.O.' ? 46 : 24,
        color: this.banner === 'K.O.' ? '#ff4a4a' : '#ffdf7a',
        weight: 'bold',
      });
      ctx.globalAlpha = 1;
    }

    if (s.phase === 'matchend') {
      const w = s.wins[0] > s.wins[1] ? 0 : 1;
      centerText(ctx, `${getCharacter(s.fighters[w].charId).name.toUpperCase()} WINS`, 150, {
        size: 20,
        color: '#ffdf7a',
        weight: 'bold',
      });
      text(ctx, 'press confirm', 240, 180, { align: 'center', size: 9, color: '#9a9ab0' });
    }
    scanlines(ctx, 480, 270, 0.05);
  }
}

function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') return seed >>> 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

import { VIEW_H, VIEW_W, getCharacter } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { buildStory, type Beat } from '../data/story.js';
import { centerText, panel, scanlines, text, vgrad } from '../render/ui.js';
import { MainMenu } from './mainmenu.js';
import { VersusScene } from './versus.js';

export class StoryScene implements Scene {
  private heroId: string;
  private beats: Beat[] = [];
  private idx = 0;
  private losses = 0;
  private typed = 0;
  private started = false;

  constructor(heroId: string) {
    this.heroId = heroId;
  }

  enter(app: App): void {
    if (!this.started) {
      this.started = true;
      this.beats = buildStory(this.heroId);
    }
    this.typed = 0;
    app.audio.startMusic({ root: 196, mode: 'minor', bpm: 84 });
    app.setHint('Enter: advance · Esc: quit to menu');
    this.runNonFight(app);
  }

  exit(app: App): void {
    app.audio.stopMusic();
  }

  /** If the current beat is a fight, launch it immediately. */
  private runNonFight(app: App): void {
    const beat = this.beats[this.idx];
    if (beat && beat.t === 'fight') this.launchFight(app);
  }

  private launchFight(app: App): void {
    const beat = this.beats[this.idx] as Extract<Beat, { t: 'fight' }>;
    app.audio.stopMusic();
    app.replace(
      new VersusScene({
        p1: this.heroId,
        p2: beat.opp,
        stageId: getCharacter(beat.opp).stage,
        controllers: [
          { kind: 'local', player: 0 },
          { kind: 'cpu', difficulty: app.settings.difficulty },
        ],
        roundsToWin: app.settings.roundsToWin,
        title: beat.title,
        returnTo: () => new MainMenu(),
        onResult: (w) => this.fightResult(app, w),
      }),
    );
  }

  private fightResult(app: App, winner: 0 | 1): void {
    if (winner === 0) {
      this.losses = 0;
      this.idx++;
    } else {
      this.losses++;
      if (this.losses >= 3) {
        app.replace(new MainMenu());
        return;
      }
      // retry same fight
    }
    app.replace(this);
  }

  tick(app: App): void {
    const beat = this.beats[this.idx];
    if (!beat) {
      if (app.input.anyConfirm() || app.input.anyCancel()) app.replace(new MainMenu());
      return;
    }
    if (beat.t === 'fight') return; // handled in enter

    if (app.input.pauseEdge()) {
      app.replace(new MainMenu());
      return;
    }

    const full = beat.t === 'line' ? beat.text.length : 0;
    if (this.typed < full) {
      this.typed = Math.min(full, this.typed + 2);
      if (app.input.anyConfirm()) this.typed = full;
      return;
    }
    if (app.input.anyConfirm()) {
      app.audio.sfx('menu');
      this.idx++;
      this.typed = 0;
      this.runNonFight(app);
    }
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    const beat = this.beats[this.idx];
    vgrad(ctx, 0, 0, VIEW_W, VIEW_H, '#12131f', '#08080c');

    if (!beat) {
      centerText(ctx, 'press any key', VIEW_H / 2, { size: 10, color: '#8a8fa4' });
      return;
    }

    if (beat.t === 'title') {
      centerText(ctx, beat.text, VIEW_H / 2 - 4, { size: 20, color: '#ffd23b', weight: 'bold' });
      centerText(ctx, 'enter', VIEW_H / 2 + 18, { size: 8, color: '#6a6f84' });
      scanlines(ctx, VIEW_W, VIEW_H, 0.05);
      return;
    }

    if (beat.t === 'line') {
      const c = getCharacter(beat.who);
      const ca = app.assets.chars.get(beat.who)!;
      const heroSide = beat.who === this.heroId;
      const px = heroSide ? 20 : VIEW_W - 20 - 96;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(ca.portrait, px, 40, 96, 96);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.palette.accent;
      ctx.strokeRect(px + 0.5, 40.5, 95, 95);

      panel(ctx, 16, 168, VIEW_W - 32, 74, 'rgba(6,8,16,0.9)', c.palette.accent);
      text(ctx, c.name.toUpperCase(), 24, 184, { size: 11, color: c.palette.accent, weight: 'bold' });
      wrap(ctx, beat.text.slice(0, this.typed), 24, 200, VIEW_W - 48, 12);
      if (this.typed >= beat.text.length && (app.frame >> 4) % 2 === 0) {
        text(ctx, '▶', VIEW_W - 30, 236, { size: 9, color: '#ffd23b' });
      }
    }
    scanlines(ctx, VIEW_W, VIEW_H, 0.05);
  }
}

function wrap(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
): void {
  const words = str.split(' ');
  let line = '';
  let yy = y;
  ctx.font = '10px ui-monospace, Menlo, monospace';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, x, yy, { size: 10, color: '#e2e2ee' });
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) text(ctx, line, x, yy, { size: 10, color: '#e2e2ee' });
}

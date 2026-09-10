import { VIEW_H, VIEW_W } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { MatchRunner, type Controller } from '../game/match.js';
import { centerText, panel, text } from '../render/ui.js';
import { MenuList } from './menu.js';

export interface VersusOpts {
  p1: string;
  p2: string;
  stageId: string;
  controllers: [Controller, Controller];
  training?: boolean;
  seed?: string | number;
  roundsToWin?: number;
  returnTo: () => Scene;
  onResult?: (winner: 0 | 1, runner: MatchRunner) => void;
  title?: string;
}

export class VersusScene implements Scene {
  private opts: VersusOpts;
  private runner!: MatchRunner;
  private paused = false;
  private pauseMenu: MenuList;
  private resultDelay = 0;
  private ended = false;

  constructor(opts: VersusOpts) {
    this.opts = opts;
    this.pauseMenu = new MenuList([
      { label: 'RESUME', onSelect: () => (this.paused = false) },
      { label: 'REMATCH', onSelect: () => this.rematch() },
      { label: 'QUIT', onSelect: () => this.quit() },
    ]);
  }

  private app!: App;

  enter(app: App): void {
    this.app = app;
    this.runner = new MatchRunner(app, {
      p1: this.opts.p1,
      p2: this.opts.p2,
      stageId: this.opts.stageId,
      seed: this.opts.seed ?? Math.floor(Math.random() * 1e9),
      controllers: this.opts.controllers,
      training: this.opts.training,
      roundsToWin: this.opts.roundsToWin,
    });
    const music = app.assets.stage(this.opts.stageId).meta.music;
    app.audio.startMusic(music);
    app.setHint(this.opts.training ? 'Training · Esc: menu' : 'Esc: pause');
  }

  exit(app: App): void {
    app.audio.stopMusic();
  }

  private rematch(): void {
    this.paused = false;
    this.ended = false;
    this.resultDelay = 0;
    this.runner = new MatchRunner(this.app, {
      p1: this.opts.p1,
      p2: this.opts.p2,
      stageId: this.opts.stageId,
      seed: Math.floor(Math.random() * 1e9),
      controllers: this.opts.controllers,
      training: this.opts.training,
      roundsToWin: this.opts.roundsToWin,
    });
  }

  private quit(): void {
    this.app.audio.stopMusic();
    this.app.replace(this.opts.returnTo());
  }

  tick(app: App): void {
    if (this.paused) {
      const r = this.pauseMenu.tick(app);
      if (r === 'cancel') this.paused = false;
      return;
    }

    if (!this.ended && !this.opts.training && app.input.anyCancel()) {
      this.paused = true;
      app.audio.sfx('menu');
      return;
    }
    if (this.opts.training && app.input.anyCancel()) {
      this.quit();
      return;
    }

    this.runner.tick(app);

    if (this.runner.over && !this.ended) {
      this.ended = true;
      this.resultDelay = 90;
    }
    if (this.ended) {
      this.resultDelay--;
      if (this.resultDelay <= 0 && app.input.anyConfirm()) {
        if (this.opts.onResult) this.opts.onResult(this.runner.matchWinner as 0 | 1, this.runner);
        else this.quit();
      }
    }
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    this.runner.draw(app, ctx);
    if (this.opts.title && this.runner.state.phase === 'intro') {
      centerText(ctx, this.opts.title, 40, { size: 10, color: '#9aa0b4' });
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(4,6,12,0.72)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      panel(ctx, VIEW_W / 2 - 70, 90, 140, 90);
      centerText(ctx, 'PAUSED', 108, { size: 14, color: '#ffd23b', weight: 'bold' });
      this.pauseMenu.draw(ctx, VIEW_W / 2 - 46, 130, { gap: 16, width: 92 });
    }
  }
}

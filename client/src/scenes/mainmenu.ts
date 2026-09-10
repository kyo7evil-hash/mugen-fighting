import { VIEW_H, VIEW_W } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { centerText, scanlines, text, vgrad } from '../render/ui.js';
import { MenuList } from './menu.js';
import { CharSelect } from './charselect.js';
import { Options } from './options.js';
import { OnlineLobby } from './online.js';

export class MainMenu implements Scene {
  private menu: MenuList;
  private t = 0;

  constructor() {
    this.menu = new MenuList([
      { label: 'ARCADE', hint: 'Fight a ladder of 7 to the final boss. One player.', onSelect: () => this.go('arcade') },
      { label: 'STORY', hint: "Play a chosen fighter's story: cutscenes and battles.", onSelect: () => this.go('story') },
      { label: 'VERSUS', hint: 'Local 1P vs CPU or 2P on shared controls.', onSelect: () => this.go('versus') },
      { label: 'TRAINING', hint: 'Free practice with hitbox display and a dummy.', onSelect: () => this.go('training') },
      { label: 'ONLINE', hint: 'Host or join a lockstep netplay match by code.', onSelect: () => this.go('online') },
      { label: 'OPTIONS', hint: 'Controls, volume, difficulty, rounds.', onSelect: () => this.go('options') },
    ]);
  }

  enter(app: App): void {
    app.audio.startMusic({ root: 174, mode: 'minor', bpm: 96 });
    app.setHint('Up/Down choose · Enter select');
  }

  private go(mode: string): void {
    const app = (window as unknown as { __app: App }).__app;
    app.audio.stopMusic();
    if (mode === 'options') app.push(new Options());
    else if (mode === 'online') app.replace(new OnlineLobby());
    else app.replace(new CharSelect(mode as 'arcade' | 'story' | 'versus' | 'training'));
  }

  tick(app: App): void {
    this.t++;
    this.menu.tick(app);
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    vgrad(ctx, 0, 0, VIEW_W, VIEW_H, '#1b2038', '#08080c');
    // parallax silhouettes of two fighters
    const bob = Math.sin(this.t / 30) * 2;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < app.assets.roster.length; i++) {
      const e = app.assets.roster[i];
      const ca = app.assets.chars.get(e.id);
      if (!ca) continue;
      const x = 40 + i * 44;
      ctx.drawImage(ca.sheet, 0, 0, 64, 64, x, 150 + (i % 2) * 6 + bob, 64, 64);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(8,8,12,0.55)';
    ctx.fillRect(0, 150, VIEW_W, 120);

    centerText(ctx, 'MUGEN FIGHTING', 54, { size: 30, color: '#ffd23b', weight: 'bold' });
    centerText(ctx, 'a 2D fighting game', 70, { size: 9, color: '#8a8fa4' });

    this.menu.draw(ctx, VIEW_W / 2 - 60, 108, { gap: 17, width: 120 });

    text(ctx, 'v0.1', 6, VIEW_H - 8, { size: 8, color: '#55596a' });
    scanlines(ctx, VIEW_W, VIEW_H, 0.06);
  }
}

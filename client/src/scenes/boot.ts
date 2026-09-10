import { VIEW_H, VIEW_W } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { centerText, vgrad } from '../render/ui.js';
import { MainMenu } from './mainmenu.js';

export class Boot implements Scene {
  private progress = 0;
  private label = '';
  private done = false;
  private started = false;

  enter(app: App): void {
    const el = document.getElementById('boot');
    if (el) el.remove();
    app.setHint('WASD / Arrows move · F,G,V,B attacks · R super · Enter confirm · Esc back');
    void app.assets
      .load((p, label) => {
        this.progress = p;
        this.label = label;
      })
      .then(() => {
        this.done = true;
      })
      .catch((err) => {
        this.label = `ERROR: ${String(err)}`;
      });
  }

  tick(app: App): void {
    if (this.done && !this.started) {
      this.started = true;
      app.replace(new MainMenu());
    }
  }

  draw(_app: App, ctx: CanvasRenderingContext2D): void {
    vgrad(ctx, 0, 0, VIEW_W, VIEW_H, '#161a2c', '#08080c');
    centerText(ctx, 'M U G E N   F I G H T I N G', 110, { size: 20, color: '#ffd23b', weight: 'bold' });
    centerText(ctx, 'ten fighters · arcade · story · versus · online', 128, {
      size: 9,
      color: '#8a8fa4',
    });
    const w = 240;
    const x = (VIEW_W - w) / 2;
    ctx.fillStyle = '#1a1c26';
    ctx.fillRect(x, 160, w, 6);
    ctx.fillStyle = '#ffd23b';
    ctx.fillRect(x, 160, w * this.progress, 6);
    centerText(ctx, this.label || 'loading…', 180, { size: 9, color: '#9aa0b4' });
  }
}

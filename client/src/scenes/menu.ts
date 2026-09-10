import { IN, VIEW_W } from '@mugen/shared';
import type { App } from '../core/app.js';
import { text } from '../render/ui.js';

export interface MenuItem {
  label: string;
  hint?: string;
  disabled?: boolean;
  onSelect?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  value?: () => string;
}

export class MenuList {
  items: MenuItem[];
  cursor = 0;
  private repeat = 0;

  constructor(items: MenuItem[]) {
    this.items = items;
  }

  setItems(items: MenuItem[]): void {
    this.items = items;
    if (this.cursor >= items.length) this.cursor = 0;
  }

  tick(app: App): 'select' | 'cancel' | null {
    const inp = app.input;
    const move = (d: number): void => {
      let n = this.cursor;
      for (let k = 0; k < this.items.length; k++) {
        n = (n + d + this.items.length) % this.items.length;
        if (!this.items[n].disabled) break;
      }
      if (n !== this.cursor) {
        this.cursor = n;
        app.audio.sfx('menu');
      }
    };

    const up = inp.uiPressed(IN.UP) || inp.keyDownEdge('ArrowUp');
    const down = inp.uiPressed(IN.DOWN) || inp.keyDownEdge('ArrowDown');
    if (up) move(-1);
    if (down) move(1);

    const cur = this.items[this.cursor];
    if (cur && !cur.disabled) {
      if (inp.uiPressed(IN.LEFT) || inp.keyDownEdge('ArrowLeft')) {
        cur.onLeft?.();
        if (cur.onLeft) app.audio.sfx('menu');
      }
      if (inp.uiPressed(IN.RIGHT) || inp.keyDownEdge('ArrowRight')) {
        cur.onRight?.();
        if (cur.onRight) app.audio.sfx('menu');
      }
    }

    if (inp.anyConfirm()) {
      if (cur && !cur.disabled) {
        app.audio.sfx('confirm');
        cur.onSelect?.();
        return 'select';
      }
    }
    if (inp.anyCancel()) {
      app.audio.sfx('cancel');
      return 'cancel';
    }
    void this.repeat;
    return null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    opts: { gap?: number; size?: number; width?: number } = {},
  ): void {
    const gap = opts.gap ?? 18;
    const size = opts.size ?? 12;
    this.items.forEach((it, i) => {
      const yy = y + i * gap;
      const sel = i === this.cursor;
      if (sel) {
        ctx.fillStyle = 'rgba(255,210,90,0.14)';
        ctx.fillRect(x - 6, yy - size, (opts.width ?? 180) + 12, size + 6);
        text(ctx, '▶', x - 4, yy, { size: size - 2, color: '#ffd23b' });
      }
      const col = it.disabled ? '#555a6a' : sel ? '#ffe9a8' : '#c8c8d8';
      text(ctx, it.label, x + 10, yy, { size, color: col });
      if (it.value) {
        text(ctx, it.value(), x + (opts.width ?? 180), yy, {
          size,
          color: sel ? '#ffd23b' : '#9aa0b4',
          align: 'right',
        });
      }
      if (sel && it.hint) {
        text(ctx, it.hint, VIEW_W / 2, 250, { size: 9, color: '#8a8fa4', align: 'center' });
      }
    });
  }
}

import { VIEW_H, VIEW_W } from '@mugen/shared';

/** Manages the pixel canvas and integer-scales it to the window. */
export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const pad = 8;
    const sx = (window.innerWidth - pad) / VIEW_W;
    const sy = (window.innerHeight - pad) / VIEW_H;
    this.scale = Math.max(1, Math.floor(Math.min(sx, sy)));
    this.canvas.style.width = `${VIEW_W * this.scale}px`;
    this.canvas.style.height = `${VIEW_H * this.scale}px`;
    const stage = document.getElementById('stage');
    if (stage) {
      stage.style.width = `${VIEW_W * this.scale}px`;
      stage.style.height = `${VIEW_H * this.scale}px`;
    }
  }

  clear(color = '#000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

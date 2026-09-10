import { Assets } from './assets.js';
import { Audio } from './audio.js';
import { Screen } from './canvas.js';
import { loadSettings, saveSettings, type Settings } from './config.js';
import { InputHub } from './input.js';

export interface Scene {
  enter?(app: App): void;
  exit?(app: App): void;
  tick(app: App): void;
  draw(app: App, ctx: CanvasRenderingContext2D): void;
}

const FRAME_MS = 1000 / 60;

export class App {
  screen: Screen;
  input: InputHub;
  audio: Audio;
  assets: Assets;
  settings: Settings;
  frame = 0;
  private scene: Scene | null = null;
  private stack: Scene[] = [];
  private acc = 0;
  private last = 0;
  private hintEl: HTMLElement | null;

  constructor(canvas: HTMLCanvasElement) {
    this.settings = loadSettings();
    this.screen = new Screen(canvas);
    this.input = new InputHub(this.settings.bindings);
    this.audio = new Audio(this.settings);
    this.assets = new Assets();
    this.hintEl = document.getElementById('hint');
    window.addEventListener('pointerdown', () => this.audio.resume(), { once: false });
    window.addEventListener('keydown', () => this.audio.resume(), { once: false });
  }

  saveSettings(): void {
    saveSettings(this.settings);
    this.input.setBindings(this.settings.bindings);
    this.audio.applyVolumes();
  }

  setHint(text: string): void {
    if (this.hintEl) this.hintEl.textContent = text;
  }

  replace(scene: Scene): void {
    this.scene?.exit?.(this);
    this.scene = scene;
    scene.enter?.(this);
  }

  push(scene: Scene): void {
    if (this.scene) this.stack.push(this.scene);
    this.scene = scene;
    scene.enter?.(this);
  }

  pop(): void {
    this.scene?.exit?.(this);
    this.scene = this.stack.pop() ?? null;
  }

  get current(): Scene | null {
    return this.scene;
  }

  private stepOnce(): void {
    this.frame++;
    this.input.sample();
    this.scene?.tick(this);
  }

  private pump(now: number): void {
    let delta = now - this.last;
    this.last = now;
    if (delta > 250) delta = FRAME_MS; // was hidden / stalled — don't spiral
    this.acc += delta;
    let steps = 0;
    while (this.acc >= FRAME_MS && steps < 6) {
      this.acc -= FRAME_MS;
      steps++;
      this.stepOnce();
    }
  }

  start(): void {
    this.last = performance.now();

    // Update clock: a Worker timer keeps ticking even when the tab is hidden
    // (rAF throttles to ~1 Hz in background tabs, which would stall netplay).
    let worker: Worker | null = null;
    try {
      const src =
        'let id=setInterval(()=>postMessage(0),6);onmessage=e=>{if(e.data==="stop"){clearInterval(id)}}';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = () => this.pump(performance.now());
    } catch {
      worker = null;
    }
    if (!worker) {
      const iv = (): void => {
        this.pump(performance.now());
        setTimeout(iv, 8);
      };
      iv();
    }

    // Render loop: draw as fast as the display allows.
    const drawLoop = (): void => {
      requestAnimationFrame(drawLoop);
      const ctx = this.screen.ctx;
      ctx.imageSmoothingEnabled = false;
      this.scene?.draw(this, ctx);
    };
    requestAnimationFrame(drawLoop);
  }
}

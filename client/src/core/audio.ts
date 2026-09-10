import type { Settings } from './config.js';

type SfxName =
  | 'hit'
  | 'hitheavy'
  | 'block'
  | 'whiff'
  | 'special'
  | 'super'
  | 'ko'
  | 'menu'
  | 'confirm'
  | 'cancel'
  | 'round'
  | 'throw'
  | 'jump';

const SCALES: Record<string, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

/** All audio is synthesised at runtime — no asset files, no licensing. */
export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private settings: Settings;
  private musicTimer = 0;
  private musicHandle: number | null = null;
  private musicCfg: { root: number; mode: string; bpm: number } | null = null;
  private step = 0;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musicGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
    }
    return this.ctx;
  }

  resume(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.settings.masterVolume;
    this.sfxGain.gain.value = this.settings.sfxVolume;
    this.musicGain.gain.value = this.settings.musicVolume * 0.5;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: GainNode,
    slideTo?: number,
  ): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, hp: number): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  sfx(name: SfxName, pitch = 1): void {
    if (!this.ctx && name !== 'confirm') this.ensure();
    switch (name) {
      case 'hit':
        this.noise(0.09, 0.5, 800);
        this.tone(180 * pitch, 0.08, 'square', 0.25, this.sfxGain, 90);
        break;
      case 'hitheavy':
        this.noise(0.16, 0.7, 400);
        this.tone(120 * pitch, 0.16, 'sawtooth', 0.35, this.sfxGain, 50);
        break;
      case 'block':
        this.noise(0.06, 0.35, 2200);
        this.tone(320, 0.05, 'square', 0.15, this.sfxGain);
        break;
      case 'whiff':
        this.noise(0.07, 0.18, 1200);
        break;
      case 'special':
        this.tone(420 * pitch, 0.22, 'sawtooth', 0.25, this.sfxGain, 180);
        this.tone(210 * pitch, 0.22, 'square', 0.15, this.sfxGain, 90);
        break;
      case 'super':
        this.tone(140, 0.5, 'sawtooth', 0.3, this.sfxGain, 700);
        this.noise(0.5, 0.3, 300);
        break;
      case 'throw':
        this.noise(0.2, 0.5, 300);
        this.tone(90, 0.2, 'square', 0.3, this.sfxGain, 60);
        break;
      case 'ko':
        this.tone(300, 0.7, 'sawtooth', 0.35, this.sfxGain, 40);
        this.noise(0.7, 0.4, 200);
        break;
      case 'jump':
        this.tone(300, 0.12, 'sine', 0.12, this.sfxGain, 520);
        break;
      case 'menu':
        this.tone(600, 0.04, 'square', 0.08, this.sfxGain);
        break;
      case 'confirm':
        this.tone(700, 0.06, 'square', 0.12, this.sfxGain);
        this.tone(1050, 0.08, 'square', 0.1, this.sfxGain);
        break;
      case 'cancel':
        this.tone(400, 0.06, 'square', 0.1, this.sfxGain, 260);
        break;
      case 'round':
        this.tone(440, 0.15, 'square', 0.18, this.sfxGain);
        this.tone(660, 0.2, 'square', 0.16, this.sfxGain);
        break;
    }
  }

  startMusic(cfg: { root: number; mode: string; bpm: number }): void {
    this.musicCfg = cfg;
    this.step = 0;
    this.ensure();
    if (this.musicHandle == null) {
      const loop = (): void => {
        this.musicTick();
        const bpm = this.musicCfg?.bpm ?? 100;
        this.musicHandle = window.setTimeout(loop, (60 / bpm / 2) * 1000);
      };
      loop();
    }
  }

  stopMusic(): void {
    if (this.musicHandle != null) {
      clearTimeout(this.musicHandle);
      this.musicHandle = null;
    }
  }

  private musicTick(): void {
    if (!this.ctx || !this.musicCfg) return;
    const { root, mode } = this.musicCfg;
    const scale = SCALES[mode] ?? SCALES.minor;
    const s = this.step;
    const bassDeg = [0, 0, 4, 4, 5, 5, 3, 3][s % 8];
    const bassFreq = root * Math.pow(2, scale[bassDeg % scale.length] / 12) * 0.5;
    this.tone(bassFreq, 0.22, 'triangle', 0.18, this.musicGain);
    if (s % 2 === 0) {
      const md = scale[(s * 3) % scale.length];
      this.tone(root * Math.pow(2, md / 12), 0.14, 'square', 0.05, this.musicGain);
    }
    if (s % 4 === 2) this.noise(0.04, 0.06, 4000);
    this.step = (s + 1) % 64;
  }
}

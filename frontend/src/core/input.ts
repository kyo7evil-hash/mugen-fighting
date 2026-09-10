import { IN } from '@mugen/shared';
import type { Bindings } from './config.js';

/**
 * Central input hub. Produces a per-player input bitmask each sim frame from
 * keyboard + gamepad, and exposes edge helpers for menus.
 */
export class InputHub {
  private down = new Set<string>();
  private bindings: Bindings;
  private prevBits: [number, number] = [0, 0];
  private curBits: [number, number] = [0, 0];
  /** menu edge state */
  private uiPrev = 0;
  private uiCur = 0;
  private prevDown = new Set<string>();
  private edgeKeys = new Set<string>();
  private padStartPrev = false;
  private padStartCur = false;
  lastKey: string | null = null;
  captureNext: ((code: string) => void) | null = null;

  constructor(bindings: Bindings) {
    this.bindings = bindings;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.captureNext) {
        e.preventDefault();
        const cb = this.captureNext;
        this.captureNext = null;
        cb(e.code);
        return;
      }
      this.down.add(e.code);
      this.lastKey = e.code;
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'Tab',
        ].includes(e.code)
      )
        e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  setBindings(b: Bindings): void {
    this.bindings = b;
  }

  private padBits(index: number): number {
    const pads = navigator.getGamepads?.() ?? [];
    const gp = pads[index];
    if (!gp) return 0;
    let b = 0;
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    if (ax < -0.4) b |= IN.LEFT;
    if (ax > 0.4) b |= IN.RIGHT;
    if (ay < -0.4) b |= IN.UP;
    if (ay > 0.4) b |= IN.DOWN;
    const btn = (i: number): boolean => !!gp.buttons[i]?.pressed;
    if (btn(12)) b |= IN.UP;
    if (btn(13)) b |= IN.DOWN;
    if (btn(14)) b |= IN.LEFT;
    if (btn(15)) b |= IN.RIGHT;
    if (btn(2)) b |= IN.LP; // X
    if (btn(3)) b |= IN.HP; // Y
    if (btn(0)) b |= IN.LK; // A
    if (btn(1)) b |= IN.HK; // B
    if (btn(4) || btn(6)) b |= IN.S1; // L1 / L2
    if (btn(5) || btn(7)) b |= IN.S2; // R1 / R2
    return b;
  }

  private keyBits(map: Record<string, number>): number {
    let b = 0;
    for (const code of this.down) {
      const bit = map[code];
      if (bit) b |= bit;
    }
    return b;
  }

  /** Call once per sim frame BEFORE reading player(). */
  sample(): void {
    this.edgeKeys.clear();
    for (const c of this.down) if (!this.prevDown.has(c)) this.edgeKeys.add(c);
    this.prevDown = new Set(this.down);
    this.prevBits = this.curBits;
    this.curBits = [
      this.keyBits(this.bindings.p1) | this.padBits(0),
      this.keyBits(this.bindings.p2) | this.padBits(1),
    ];
    this.uiPrev = this.uiCur;
    this.uiCur = this.curBits[0] | this.curBits[1] | this.padBits(0) | this.padBits(1);

    this.padStartPrev = this.padStartCur;
    const pads = navigator.getGamepads?.() ?? [];
    this.padStartCur = !!(pads[0]?.buttons[9]?.pressed || pads[1]?.buttons[9]?.pressed);
  }

  player(i: 0 | 1): number {
    return this.curBits[i];
  }

  pressedP(i: 0 | 1, bit: number): boolean {
    return (this.curBits[i] & bit) !== 0 && (this.prevBits[i] & bit) === 0;
  }

  /** UI edge: any player pressing this direction/button this frame. */
  uiPressed(bit: number): boolean {
    return (this.uiCur & bit) !== 0 && (this.uiPrev & bit) === 0;
  }

  uiHeld(bit: number): boolean {
    return (this.uiCur & bit) !== 0;
  }

  anyConfirm(): boolean {
    return this.uiPressed(IN.LP) || this.uiPressed(IN.HP) || this.uiPressed(IN.S1) || this.keyDownEdge('Enter') || this.keyDownEdge('Space');
  }

  /** Menu "back": attack buttons double as cancel. Do NOT use during a live match. */
  anyCancel(): boolean {
    return this.uiPressed(IN.LK) || this.uiPressed(IN.HK) || this.keyDownEdge('Escape') || this.keyDownEdge('Backspace');
  }

  /**
   * Gameplay pause / quit-to-menu. Escape / Backspace or the gamepad Start
   * button only — never LK/HK, which are attack inputs during a fight.
   */
  pauseEdge(): boolean {
    return (
      this.keyDownEdge('Escape') ||
      this.keyDownEdge('Backspace') ||
      (this.padStartCur && !this.padStartPrev)
    );
  }

  keyDownEdge(code: string): boolean {
    return this.edgeKeys.has(code);
  }

  keyHeld(code: string): boolean {
    return this.down.has(code);
  }
}

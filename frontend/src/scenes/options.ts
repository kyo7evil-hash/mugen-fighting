import { IN, VIEW_H, VIEW_W } from '@mugen/shared';
import type { App, Scene } from '../core/app.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import { centerText, panel, scanlines, text, vgrad } from '../render/ui.js';
import { MenuList } from './menu.js';

const DIFF = ['EASY', 'NORMAL', 'HARD'];
const ACTIONS: [string, number][] = [
  ['Up', IN.UP],
  ['Down', IN.DOWN],
  ['Left', IN.LEFT],
  ['Right', IN.RIGHT],
  ['Light Punch', IN.LP],
  ['Heavy Punch', IN.HP],
  ['Light Kick', IN.LK],
  ['Heavy Kick', IN.HK],
  ['Super (S1)', IN.S1],
  ['Macro (S2)', IN.S2],
];

export class Options implements Scene {
  private menu!: MenuList;
  private rebinding: number | null = null;
  private tab: 'game' | 'keys' = 'game';

  enter(app: App): void {
    app.setHint('Left/Right adjust · Enter select · Esc back');
    this.build(app);
  }

  private build(app: App): void {
    const s = app.settings;
    if (this.tab === 'game') {
      this.menu = new MenuList([
        {
          label: 'Difficulty',
          value: () => DIFF[s.difficulty],
          onLeft: () => ((s.difficulty = Math.max(0, s.difficulty - 1) as 0 | 1 | 2), app.saveSettings()),
          onRight: () => ((s.difficulty = Math.min(2, s.difficulty + 1) as 0 | 1 | 2), app.saveSettings()),
        },
        {
          label: 'Rounds to win',
          value: () => String(s.roundsToWin),
          onLeft: () => ((s.roundsToWin = Math.max(1, s.roundsToWin - 1)), app.saveSettings()),
          onRight: () => ((s.roundsToWin = Math.min(5, s.roundsToWin + 1)), app.saveSettings()),
        },
        {
          label: 'Round time',
          value: () => `${s.roundTime}s`,
          onLeft: () => ((s.roundTime = Math.max(30, s.roundTime - 10)), app.saveSettings()),
          onRight: () => ((s.roundTime = Math.min(99, s.roundTime + 10)), app.saveSettings()),
        },
        {
          label: 'Master volume',
          value: () => `${Math.round(s.masterVolume * 100)}%`,
          onLeft: () => (adj(s, 'masterVolume', -0.1), app.saveSettings()),
          onRight: () => (adj(s, 'masterVolume', 0.1), app.saveSettings()),
        },
        {
          label: 'SFX volume',
          value: () => `${Math.round(s.sfxVolume * 100)}%`,
          onLeft: () => (adj(s, 'sfxVolume', -0.1), app.saveSettings()),
          onRight: () => (adj(s, 'sfxVolume', 0.1), app.saveSettings()),
        },
        {
          label: 'Music volume',
          value: () => `${Math.round(s.musicVolume * 100)}%`,
          onLeft: () => (adj(s, 'musicVolume', -0.1), app.saveSettings()),
          onRight: () => (adj(s, 'musicVolume', 0.1), app.saveSettings()),
        },
        {
          label: 'Show hitboxes',
          value: () => (s.showHitboxes ? 'ON' : 'OFF'),
          onLeft: () => ((s.showHitboxes = !s.showHitboxes), app.saveSettings()),
          onRight: () => ((s.showHitboxes = !s.showHitboxes), app.saveSettings()),
          onSelect: () => ((s.showHitboxes = !s.showHitboxes), app.saveSettings()),
        },
        {
          label: 'Netplay input delay',
          value: () => `${s.inputDelay} f`,
          onLeft: () => ((s.inputDelay = Math.max(1, s.inputDelay - 1)), app.saveSettings()),
          onRight: () => ((s.inputDelay = Math.min(8, s.inputDelay + 1)), app.saveSettings()),
        },
        { label: 'Edit P1 controls…', onSelect: () => ((this.tab = 'keys'), this.build(app)) },
      ]);
    } else {
      const items = ACTIONS.map(([name, bit], i) => ({
        label: name,
        value: () => keyFor(app, bit),
        onSelect: () => this.startRebind(app, i),
      }));
      items.push({
        label: 'Reset to defaults',
        value: () => '',
        onSelect: () => {
          app.settings.bindings = structuredClone(DEFAULT_SETTINGS.bindings);
          app.saveSettings();
        },
      });
      items.push({ label: '‹ Back', value: () => '', onSelect: () => ((this.tab = 'game'), this.build(app)) });
      this.menu = new MenuList(items);
    }
  }

  private startRebind(app: App, actionIdx: number): void {
    this.rebinding = actionIdx;
    const bit = ACTIONS[actionIdx][1];
    app.input.captureNext = (code: string) => {
      this.rebinding = null;
      // Escape cancels the rebind rather than binding itself.
      if (code === 'Escape') return;

      const map = app.settings.bindings.p1;
      const prevKeyForBit = Object.keys(map).find((k) => map[k] === bit);
      const displaced = map[code]; // what `code` currently does, if anything

      map[code] = bit;
      if (prevKeyForBit && prevKeyForBit !== code) {
        delete map[prevKeyForBit];
        // If we stole `code` from another action, hand that action the freed key.
        if (displaced !== undefined && displaced !== bit) map[prevKeyForBit] = displaced;
      }
      app.saveSettings();
    };
  }

  tick(app: App): void {
    if (this.rebinding !== null) {
      if (app.input.keyDownEdge('Escape')) {
        app.input.captureNext = null;
        this.rebinding = null;
      }
      return;
    }
    const r = this.menu.tick(app);
    if (r === 'cancel') {
      if (this.tab === 'keys') {
        this.tab = 'game';
        this.build(app);
      } else {
        app.pop();
      }
    }
  }

  draw(app: App, ctx: CanvasRenderingContext2D): void {
    vgrad(ctx, 0, 0, VIEW_W, VIEW_H, '#1a1c2e', '#08080c');
    centerText(ctx, this.tab === 'game' ? 'OPTIONS' : 'P1 CONTROLS', 22, {
      size: 14,
      color: '#ffd23b',
      weight: 'bold',
    });
    panel(ctx, 60, 34, VIEW_W - 120, VIEW_H - 60);
    this.menu.draw(ctx, 80, 54, { gap: this.tab === 'game' ? 19 : 17, width: VIEW_W - 160 });
    if (this.rebinding !== null) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      centerText(ctx, `press a key for "${ACTIONS[this.rebinding][0]}"`, VIEW_H / 2, {
        size: 11,
        color: '#ffe9a8',
      });
      centerText(ctx, 'Esc to cancel', VIEW_H / 2 + 16, { size: 8, color: '#8a8fa4' });
    }
    scanlines(ctx, VIEW_W, VIEW_H, 0.05);
  }
}

function adj(s: import('../core/config.js').Settings, k: 'masterVolume' | 'sfxVolume' | 'musicVolume', d: number): void {
  s[k] = Math.max(0, Math.min(1, Math.round((s[k] + d) * 100) / 100));
}
function keyFor(app: App, bit: number): string {
  const entry = Object.entries(app.settings.bindings.p1).find(([, v]) => v === bit);
  return entry ? entry[0].replace('Key', '').replace('Arrow', '').replace('Numpad', 'Num') : '—';
}
